import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Submission';
import { Quiz } from '../models/Quiz';
import { QuizQuestion } from '../models/QuizQuestion';
import { QuizAttempt } from '../models/QuizAttempt';
import { StudyMaterial } from '../models/StudyMaterial';
import { Notice } from '../models/Notice';
import { MarkRecord } from '../models/MarkRecord';
import { PublishedResult } from '../models/PublishedResult';
import { CodingChallenge } from '../models/CodingChallenge';
import { StudentNote } from '../models/StudentNote';
import logger from '../utils/logger';

const createClassSchema = z.object({
  subjectName: z.string().min(2, 'Subject name must be at least 2 characters'),
  subjectCode: z.string().min(2, 'Subject code is required').toUpperCase(),
  department: z.string().min(2, 'Department is required'),
  semester: z.string().min(1, 'Semester is required'),
  section: z.string().min(1, 'Section is required'),
  academicYear: z.string().min(4, 'Academic year is required'),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

const generateJoinCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // Generates 8 char string
};

export const createClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createClassSchema.parse(req.body);

    // Generate unique join code
    let joinCode = generateJoinCode();
    let isUnique = false;
    while (!isUnique) {
      const existingClass = await Class.findOne({ joinCode });
      if (!existingClass) {
        isUnique = true;
      } else {
        joinCode = generateJoinCode();
      }
    }

    const newClass = await Class.create({
      ...validatedData,
      facultyId: req.user?._id,
      joinCode,
    });

    res.status(201).json({
      success: true,
      data: newClass,
    });
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Build the class filter based on role
    let classFilter: Record<string, unknown> = { isActive: true };

    if (user.role === 'Faculty') {
      classFilter = { facultyId: user._id };
    } else if (user.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id }).select('classId');
      const classIds = enrollments.map((e) => e.classId);
      classFilter = { _id: { $in: classIds }, isActive: true };
    }
    // Admin: isActive: true only

    // Single aggregation replaces N+1 countDocuments per class (CQ-005)
    const classesWithStudentCount = await Class.aggregate([
      { $match: classFilter },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'classId',
          as: 'enrolledStudents',
        },
      },
      {
        $addFields: {
          studentCount: { $size: '$enrolledStudents' },
        },
      },
      {
        $project: {
          enrolledStudents: 0, // Drop the raw array — we only needed the count
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Populate facultyId after aggregation
    await Class.populate(classesWithStudentCount, {
      path: 'facultyId',
      select: 'name email avatarUrl', // Removed duplicate avatarUrl (CQ-014)
    });

    res.status(200).json({
      success: true,
      data: classesWithStudentCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id;
    const user = req.user;

    const classData = await Class.findById(classId).populate('facultyId', 'name email avatarUrl');

    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Access check
    if (user?.role === 'Student') {
      const isEnrolled = await Enrollment.findOne({ classId, studentId: user._id });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not authorized to access this class');
      }
    } else if (user?.role === 'Faculty') {
      if (classData.facultyId._id.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this class');
      }
    }

    // Get enrollments and populate students
    const enrollments = await Enrollment.find({ classId }).populate(
      'studentId',
      'name email rollNo department avatarUrl'
    );
    const students = enrollments.map((e) => e.studentId);
    const studentCount = students.length;

    res.status(200).json({
      success: true,
      data: {
        ...classData.toObject(),
        studentCount,
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const joinClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { joinCode } = req.body;
    const user = req.user;

    if (!joinCode) {
      res.status(400);
      throw new Error('Join code is required');
    }

    // Extract code if it's a URL
    const code = joinCode.includes('/')
      ? joinCode.split('/').pop()?.toUpperCase()
      : joinCode.toUpperCase();

    const classData = await Class.findOne({ joinCode: code, isActive: true });

    if (!classData) {
      res.status(404);
      throw new Error('Invalid join code or class is inactive');
    }

    // Check existing enrollment
    const existingEnrollment = await Enrollment.findOne({
      classId: classData.id,
      studentId: user?._id,
    });
    if (existingEnrollment) {
      res.status(400);
      throw new Error('Already enrolled in this class');
    }

    await Enrollment.create({
      classId: classData.id,
      studentId: user?._id,
    });

    res.status(200).json({
      success: true,
      message: 'Successfully joined class',
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassRoster = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this roster');
    }

    const enrollments = await Enrollment.find({ classId }).populate(
      'studentId',
      'name email rollNo department semester section avatarUrl'
    );

    // Map to just the student objects for easier frontend consumption
    const roster = enrollments.map((e) => {
      const student = e.studentId as unknown as {
        toObject?: () => Record<string, unknown>;
      } & Record<string, unknown>;
      return {
        ...(student.toObject ? student.toObject() : student),
        joinedAt: e.joinedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: roster,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClassMaxMarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id;
    const user = req.user;
    const { maxMarks } = req.body;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this class');
    }

    classData.maxMarks = { ...classData.maxMarks, ...maxMarks };
    await classData.save();

    res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

const updateClassSchema = z.object({
  subjectName: z.string().min(2).optional(),
  subjectCode: z.string().min(2).optional(),
  department: z.string().min(2).optional(),
  semester: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  academicYear: z.string().min(4).optional(),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export const updateClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id as string;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(classId as string)) {
      res.status(400);
      throw new Error('Invalid class ID');
    }

    const validatedData = updateClassSchema.parse(req.body);

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this class');
    }

    Object.assign(classData, validatedData);
    await classData.save();

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cascade-deletes all data associated with a set of class IDs.
 * Used by both deleteClass and deleteAllClasses.
 */
const cascadeDeleteClasses = async (classIds: mongoose.Types.ObjectId[]) => {
  if (classIds.length === 0) return;

  // Collect assignment IDs so we can delete their submissions
  const assignments = await Assignment.find({ classId: { $in: classIds } }).select('_id').lean();
  const assignmentIds = assignments.map((a) => a._id);

  // Collect quiz IDs so we can delete their questions and attempts
  const quizzes = await Quiz.find({ classId: { $in: classIds } }).select('_id').lean();
  const quizIds = quizzes.map((q) => q._id);

  await Promise.all([
    // Direct classId references
    Enrollment.deleteMany({ classId: { $in: classIds } }),
    Assignment.deleteMany({ classId: { $in: classIds } }),
    Quiz.deleteMany({ classId: { $in: classIds } }),
    StudyMaterial.deleteMany({ classId: { $in: classIds } }),
    Notice.deleteMany({ classId: { $in: classIds } }),
    MarkRecord.deleteMany({ classId: { $in: classIds } }),
    PublishedResult.deleteMany({ classId: { $in: classIds } }),
    // Indirect references (via assignment / quiz IDs)
    ...(assignmentIds.length > 0 ? [Submission.deleteMany({ assignmentId: { $in: assignmentIds } })] : []),
    ...(quizIds.length > 0
      ? [
          QuizQuestion.deleteMany({ quizId: { $in: quizIds } }),
          QuizAttempt.deleteMany({ quizId: { $in: quizIds } }),
        ]
      : []),
    // Unlink challenges (they are global — keep the card, just remove the class link)
    CodingChallenge.updateMany({ classId: { $in: classIds } }, { $set: { classId: null } }),
    // Delete student notes for this class
    StudentNote.deleteMany({ classId: { $in: classIds } }),
    // Delete the class documents themselves
    Class.deleteMany({ _id: { $in: classIds } }),
  ]);
};

/**
 * DELETE /classes/:id
 * Deletes a single class and all its associated data.
 * Faculty: own classes only. Admin: any class.
 */
export const deleteClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.id as string;
    const user = req.user!;

    if (!mongoose.Types.ObjectId.isValid(classId as string)) {
      res.status(400);
      throw new Error('Invalid class ID');
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this class');
    }

    await cascadeDeleteClasses([classData._id as mongoose.Types.ObjectId]);

    logger.info({ classId, deletedBy: user._id }, 'Class and all associated data deleted');

    res.status(200).json({
      success: true,
      message: `Class "${classData.subjectName}" and all its data have been permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /classes
 * Deletes all classes created by the authenticated Faculty (or all classes for Admin).
 * Each class is fully cascade-deleted.
 */
export const deleteAllClasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Scope: Faculty deletes only their own; Admin deletes all
    const filter = user.role === 'Admin' ? {} : { facultyId: user._id };

    const allClasses = await Class.find(filter).select('_id subjectName').lean();
    if (allClasses.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No classes to delete.',
        deletedCount: 0,
      });
      return;
    }

    const classIds = allClasses.map((c) => c._id as mongoose.Types.ObjectId);
    await cascadeDeleteClasses(classIds);

    logger.info({ count: classIds.length, deletedBy: user._id }, 'All classes deleted by faculty/admin');

    res.status(200).json({
      success: true,
      message: `${classIds.length} class(es) and all associated data have been permanently deleted.`,
      deletedCount: classIds.length,
    });
  } catch (error) {
    next(error);
  }
};
