import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { CodingChallenge } from '../models/CodingChallenge';
import { ChallengeParticipant } from '../models/ChallengeParticipant';
import { ContestResult } from '../models/ContestResult';
import { ContestProblemResult } from '../models/ContestProblemResult';
import { StudentCodingAccount } from '../models/StudentCodingAccount';
import { SUPPORTED_PLATFORMS } from '../providers/types';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { computeEffectiveStatus } from '../utils/challengeUtils';
import { ChallengeSyncService } from '../services/challengeSyncService';
import { LeaderboardService } from '../services/leaderboardService';
import { AnalyticsService } from '../services/analyticsService';
import { ProviderError } from '../providers/types';
import logger from '../utils/logger';

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

const createChallengeSchema = z
  .object({
    title: z.string().min(3).max(200),
    platform: z.enum(SUPPORTED_PLATFORMS as any),
    externalContestId: z.string().min(1),
    externalUrl: z.string().url(),
    description: z.string().max(2000).optional().default(''),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    classId: z.string().optional().nullable(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

export const createChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createChallengeSchema.parse(req.body);
    const user = req.user!;

    if (validatedData.classId) {
      const classData = await Class.findById(validatedData.classId);
      if (!classData) {
        res.status(404);
        throw new Error('Class not found');
      }
      if (user.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to create challenge for this class');
      }
    }

    const challengeData: any = {
      ...validatedData,
      publicationStatus: 'Draft',
      syncStatus: 'NotRequired',
      createdBy: user._id,
    };
    if (validatedData.classId === null) {
      delete challengeData.classId; // Mongoose schema has default: null anyway
    }

    const challenge = await CodingChallenge.create(challengeData);

    res.status(201).json({
      success: true,
      message: 'Coding challenge created successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
};

export const publishChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const user = req.user!;

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to publish this challenge');
    }

    if (challenge.publicationStatus === 'Published') {
      res.status(400);
      throw new Error('Challenge is already published');
    }

    challenge.publicationStatus = 'Published';
    challenge.publishedAt = new Date();
    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge published successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
};

const updateChallengeSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  platform: z.enum(SUPPORTED_PLATFORMS as any).optional(),
  externalContestId: z.string().min(1).optional(),
  externalUrl: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  classId: z.string().optional().nullable(),
});

export const updateChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const validatedData = updateChallengeSchema.parse(req.body);
    const user = req.user!;

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this challenge');
    }

    // Mutability logic
    if (challenge.participantCount > 0) {
      const immutableFields = ['platform', 'externalContestId', 'classId', 'startTime', 'endTime'];
      for (const field of immutableFields) {
        if (field in validatedData && (validatedData as any)[field] !== undefined) {
          res.status(400);
          throw new Error(`Cannot modify ${field} after participants have registered`);
        }
      }
    }

    if (validatedData.classId && validatedData.classId !== challenge.classId?.toString()) {
      const classData = await Class.findById(validatedData.classId);
      if (!classData) {
        res.status(404);
        throw new Error('Class not found');
      }
      if (user.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to assign challenge to this class');
      }
    }

    Object.assign(challenge, validatedData);

    if (challenge.startTime >= challenge.endTime) {
      res.status(400);
      throw new Error('endTime must be after startTime');
    }

    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge updated successfully',
      data: challenge,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const user = req.user!;

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to archive this challenge');
    }

    challenge.isActive = false;
    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const listChallenges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    let filter: any = { isActive: true };

    if (user.role === 'Student') {
      filter.publicationStatus = 'Published';
      const enrollments = await Enrollment.find({ studentId: user._id });
      const enrolledClassIds = enrollments.map((e) => e.classId);

      filter.$or = [{ classId: null }, { classId: { $in: enrolledClassIds } }];
    } else if (user.role === 'Faculty') {
      filter.createdBy = user._id;
    }

    const total = await CodingChallenge.countDocuments(filter);
    let challenges = await CodingChallenge.find(filter)
      .sort({ endTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('classId', 'subjectName subjectCode')
      .lean();

    const challengesWithStatus = challenges.map((challenge) => {
      const status = computeEffectiveStatus({
        publicationStatus: challenge.publicationStatus,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
      });
      return { ...challenge, computedStatus: status };
    });

    res.status(200).json({
      success: true,
      data: challengesWithStatus,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getChallengeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const user = req.user!;

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true }).populate(
      'classId',
      'subjectName subjectCode'
    );

    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Student') {
      if (challenge.publicationStatus === 'Draft') {
        res.status(403);
        throw new Error('Not authorized to view draft challenges');
      }

      if (challenge.classId) {
        const isEnrolled = await Enrollment.findOne({
          classId: challenge.classId,
          studentId: user._id,
        });
        if (!isEnrolled) {
          res.status(403);
          throw new Error('Not enrolled in the class for this challenge');
        }
      }
    } else if (user.role === 'Faculty') {
      if (challenge.createdBy.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view this challenge');
      }
    }

    const computedStatus = computeEffectiveStatus({
      publicationStatus: challenge.publicationStatus,
      startTime: challenge.startTime,
      endTime: challenge.endTime,
    });

    res.status(200).json({
      success: true,
      data: { ...challenge.toObject(), computedStatus },
    });
  } catch (error) {
    next(error);
  }
};

export const registerForChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id;
    const user = req.user!;

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (challenge.publicationStatus !== 'Published') {
      res.status(400);
      throw new Error('Challenge is not published');
    }

    const status = computeEffectiveStatus({
      publicationStatus: challenge.publicationStatus,
      startTime: challenge.startTime,
      endTime: challenge.endTime,
    });

    if (status !== 'Upcoming' && status !== 'Active') {
      res.status(400);
      throw new Error(`Cannot register for challenge in ${status} state`);
    }

    if (challenge.classId) {
      const isEnrolled = await Enrollment.findOne({
        classId: challenge.classId,
        studentId: user._id,
      });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not enrolled in the class for this challenge');
      }
    }

    const account = await StudentCodingAccount.findOne({
      studentId: user._id,
      platform: challenge.platform,
      isVerified: true,
    });

    if (!account) {
      res.status(403);
      throw new Error(
        `Verified coding account for ${challenge.platform} is required to participate`
      );
    }

    try {
      const participant = await ChallengeParticipant.create({
        challengeId: challenge._id,
        studentId: user._id,
        platform: challenge.platform,
        handle: account.handle,
      });

      challenge.participantCount += 1;
      await challenge.save();

      res.status(201).json({
        success: true,
        message: 'Successfully registered for the challenge',
        data: participant,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(400);
        throw new Error('Already registered for this challenge');
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

export const syncChallengeAPI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id as string;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      res.status(400);
      throw new Error('Invalid challenge ID format');
    }

    if (user.role === 'Student') {
      res.status(403);
      throw new Error('Not authorized to sync challenges');
    }

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to sync this challenge');
    }

    try {
      await ChallengeSyncService.syncChallenge(challengeId);
      res.status(200).json({
        success: true,
        message: 'Challenge synchronized successfully',
      });
    } catch (error: any) {
      // Safe application-level error
      res.status(400);
      if (error instanceof ProviderError) {
        throw new Error(`Synchronization failed: [${error.code}] ${error.message}`);
      }
      throw new Error(error.message || 'Synchronization failed');
    }
  } catch (error) {
    next(error);
  }
};

export const getLeaderboardAPI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      res.status(400);
      throw new Error('Invalid challenge ID format');
    }

    const leaderboard = await LeaderboardService.getLeaderboard(challengeId);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsAPI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id as string;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      res.status(400);
      throw new Error('Invalid challenge ID format');
    }

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    // Authorization: Admin or Faculty creator
    if (user.role === 'Student') {
      res.status(403);
      throw new Error('Not authorized to view analytics');
    }
    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view analytics for this challenge');
    }

    const analytics = await AnalyticsService.getChallengeAnalytics(challengeId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /challenges/:id/reset
 * Deletes all participant registrations, contest results, and problem results
 * for the given challenge, then resets the challenge's sync state so it can
 * be reused for a new contest run.
 * Authorization: Faculty (own challenges only) or Admin.
 */
export const resetChallenge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challengeId = req.params.id as string;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      res.status(400);
      throw new Error('Invalid challenge ID format');
    }

    const challenge = await CodingChallenge.findOne({ _id: challengeId, isActive: true });
    if (!challenge) {
      res.status(404);
      throw new Error('Challenge not found');
    }

    if (user.role === 'Faculty' && challenge.createdBy.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to reset this challenge');
    }

    // Delete all result data tied to this challenge
    const [contestResults, problemResults, participants] = await Promise.all([
      ContestResult.deleteMany({ challengeId }),
      ContestProblemResult.deleteMany({ challengeId }),
      ChallengeParticipant.deleteMany({ challengeId }),
    ]);

    logger.info(
      {
        challengeId,
        deletedContestResults: contestResults.deletedCount,
        deletedProblemResults: problemResults.deletedCount,
        deletedParticipants: participants.deletedCount,
        resetBy: user._id,
      },
      'Challenge result data reset'
    );

    // Reset the challenge's sync state and participant counter
    challenge.participantCount = 0;
    challenge.syncStatus = 'NotRequired';
    challenge.syncAttempts = 0;
    challenge.lastSyncAttemptAt = undefined;
    challenge.lastSuccessfulSyncAt = undefined;
    challenge.lastSyncError = undefined;
    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge result data cleared. The challenge card is ready for reuse.',
      data: {
        deletedContestResults: contestResults.deletedCount,
        deletedProblemResults: problemResults.deletedCount,
        deletedParticipants: participants.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
