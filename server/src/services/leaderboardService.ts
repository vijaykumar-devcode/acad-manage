import mongoose from 'mongoose';
import { CodingChallenge } from '../models/CodingChallenge';
import { ContestResult } from '../models/ContestResult';

export interface LeaderboardEntry {
  leaderboardRank: number; // locally computed
  providerRank: number;
  rollNo?: string;
  name: string;
  department?: string;
  semester?: string;
  handle: string;
  solvedCount: number;
  penalty: number;
  ratingChange: number | null;
  participationStatus: string;
}

export interface LeaderboardResponse {
  syncStatus: string;
  lastSuccessfulSyncAt?: Date | null;
  entries: LeaderboardEntry[];
}

export class LeaderboardService {
  /**
   * Retrieves the privacy-safe leaderboard for a given challenge.
   * Ranks students based on solvedCount (DESC) and penalty (ASC).
   * Implements standard competition ranking (1224).
   */
  static async getLeaderboard(
    challengeId: string | mongoose.Types.ObjectId
  ): Promise<LeaderboardResponse> {
    const challenge = await CodingChallenge.findById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.syncStatus === 'Pending' || challenge.syncStatus === 'NotRequired') {
      return {
        syncStatus: challenge.syncStatus,
        lastSuccessfulSyncAt: challenge.lastSuccessfulSyncAt,
        entries: [],
      };
    }

    const results = await ContestResult.find({ challengeId: challenge._id })
      .populate('studentId', 'name rollNo department semester')
      .sort({ solvedCount: -1, penalty: 1 })
      .lean();

    if (results.length === 0) {
      return {
        syncStatus: challenge.syncStatus,
        lastSuccessfulSyncAt: challenge.lastSuccessfulSyncAt,
        entries: [],
      };
    }

    const entries: LeaderboardEntry[] = [];
    let currentRank = 1;
    let prevSolved = -1;
    let prevPenalty = -1;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const student = result.studentId as any;

      // Handle missing student references gracefully (e.g., if a student was deleted,
      // though cascade delete should handle this, it's safer to check).
      if (!student) continue;

      if (i > 0) {
        if (result.solvedCount < prevSolved || result.penalty > prevPenalty) {
          currentRank = i + 1;
        }
        // If solvedCount and penalty are identical to previous, they keep the same currentRank
      }

      entries.push({
        leaderboardRank: currentRank,
        providerRank: result.providerRank,
        rollNo: student.rollNo,
        name: student.name,
        department: student.department,
        semester: student.semester,
        handle: result.handle,
        solvedCount: result.solvedCount,
        penalty: result.penalty,
        ratingChange: result.ratingChange ?? null,
        participationStatus: result.participationStatus,
      });

      prevSolved = result.solvedCount;
      prevPenalty = result.penalty;
    }

    return {
      syncStatus: challenge.syncStatus,
      lastSuccessfulSyncAt: challenge.lastSuccessfulSyncAt,
      entries,
    };
  }
}
