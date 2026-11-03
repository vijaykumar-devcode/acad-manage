import mongoose from 'mongoose';
import { CodingChallenge } from '../models/CodingChallenge';
import { ChallengeParticipant } from '../models/ChallengeParticipant';
import { ContestResult } from '../models/ContestResult';
import { ContestProblemResult } from '../models/ContestProblemResult';

export interface ProblemMetrics {
  problemId: string;
  problemName: string;
  attemptedCount: number;
  solvedCount: number;
  solveRate: number; // 0 to 1
}

export interface ChallengeAnalytics {
  syncStatus: string;
  lastSuccessfulSyncAt?: Date | null;
  totalRegistered: number;
  totalParticipants: number;
  totalNonParticipants: number;
  participationRate: number; // 0 to 1
  averageSolvedCount: number;
  maxSolvedCount: number;
  averagePenalty: number;
  problemMetrics: ProblemMetrics[];
}

export class AnalyticsService {
  /**
   * Aggregates analytics for a specific coding challenge.
   */
  static async getChallengeAnalytics(
    challengeId: string | mongoose.Types.ObjectId
  ): Promise<ChallengeAnalytics> {
    const challenge = await CodingChallenge.findById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const totalRegistered = await ChallengeParticipant.countDocuments({
      challengeId: challenge._id,
    });

    // Handle states where we shouldn't attempt to aggregate
    if (challenge.syncStatus === 'Pending' || challenge.syncStatus === 'NotRequired') {
      return {
        syncStatus: challenge.syncStatus,
        lastSuccessfulSyncAt: challenge.lastSuccessfulSyncAt,
        totalRegistered,
        totalParticipants: 0,
        totalNonParticipants: 0,
        participationRate: 0,
        averageSolvedCount: 0,
        maxSolvedCount: 0,
        averagePenalty: 0,
        problemMetrics: [],
      };
    }

    // 1. Overall Metrics
    const results = await ContestResult.find({ challengeId: challenge._id }).lean();

    let totalParticipants = 0;
    let totalNonParticipants = 0;
    let sumSolved = 0;
    let maxSolved = 0;
    let sumPenalty = 0;

    for (const result of results) {
      if (result.participationStatus === 'DidNotParticipate') {
        totalNonParticipants++;
      } else {
        totalParticipants++;
        sumSolved += result.solvedCount;
        if (result.solvedCount > maxSolved) maxSolved = result.solvedCount;
        sumPenalty += result.penalty;
      }
    }

    const participationRate = totalRegistered > 0 ? totalParticipants / totalRegistered : 0;
    const averageSolvedCount = totalParticipants > 0 ? sumSolved / totalParticipants : 0;
    const averagePenalty = totalParticipants > 0 ? sumPenalty / totalParticipants : 0;

    // 2. Problem-wise Metrics
    const problemAggregations = await ContestProblemResult.aggregate([
      { $match: { challengeId: challenge._id } },
      {
        $group: {
          _id: '$problemId',
          problemName: { $first: '$problemName' },
          totalAttempts: { $sum: '$attempts' },
          solvedCount: {
            $sum: { $cond: [{ $eq: ['$solved', true] }, 1, 0] },
          },
          attemptedCount: {
            $sum: { $cond: [{ $gt: ['$attempts', 0] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const problemMetrics: ProblemMetrics[] = problemAggregations.map((p) => {
      // Avoid division by zero
      const solveRate = p.attemptedCount > 0 ? p.solvedCount / p.attemptedCount : 0;
      return {
        problemId: p._id,
        problemName: p.problemName,
        attemptedCount: p.attemptedCount,
        solvedCount: p.solvedCount,
        solveRate,
      };
    });

    return {
      syncStatus: challenge.syncStatus,
      lastSuccessfulSyncAt: challenge.lastSuccessfulSyncAt,
      totalRegistered,
      totalParticipants,
      totalNonParticipants,
      participationRate,
      averageSolvedCount,
      maxSolvedCount: maxSolved,
      averagePenalty,
      problemMetrics,
    };
  }
}
