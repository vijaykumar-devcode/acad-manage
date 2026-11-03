import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { ChallengeSyncService } from '../../src/services/challengeSyncService';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { ChallengeParticipant } from '../../src/models/ChallengeParticipant';
import { ContestResult } from '../../src/models/ContestResult';
import { ContestProblemResult } from '../../src/models/ContestProblemResult';
import { getProvider } from '../../src/providers/registry';
import { ProviderError } from '../../src/providers/types';

vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/models/ChallengeParticipant');
vi.mock('../../src/models/ContestResult');
vi.mock('../../src/models/ContestProblemResult');
vi.mock('../../src/providers/registry');

describe('ChallengeSyncService', () => {
  const mockChallengeId = new mongoose.Types.ObjectId();
  const mockStudentId1 = new mongoose.Types.ObjectId();
  const mockStudentId2 = new mongoose.Types.ObjectId();
  
  let mockChallenge: any;
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChallenge = {
      _id: mockChallengeId,
      platform: 'codeforces',
      externalContestId: '1234',
      syncStatus: 'Pending',
      syncAttempts: 0,
      startTime: new Date(Date.now() - 86400000), // yesterday
      save: vi.fn().mockResolvedValue(true)
    };

    mockProvider = {
      fetchStandings: vi.fn(),
      normalizeParticipationType: vi.fn().mockReturnValue('Contestant')
    };

    vi.mocked(CodingChallenge.findById).mockResolvedValue(mockChallenge as any);
    vi.mocked(getProvider).mockReturnValue(mockProvider as any);
  });

  describe('Concurrency & Stale Locks', () => {
    it('should reject fresh Syncing', async () => {
      mockChallenge.syncStatus = 'Syncing';
      mockChallenge.lastSyncAttemptAt = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago

      await expect(ChallengeSyncService.syncChallenge(mockChallengeId)).rejects.toThrow('Synchronization is already in progress');
      expect(mockChallenge.save).not.toHaveBeenCalled();
    });

    it('should recover stale Syncing', async () => {
      mockChallenge.syncStatus = 'Syncing';
      mockChallenge.lastSyncAttemptAt = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago

      vi.mocked(ChallengeParticipant.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      await ChallengeSyncService.syncChallenge(mockChallengeId);
      expect(mockChallenge.save).toHaveBeenCalled();
      expect(mockChallenge.syncStatus).toBe('Synced');
    });
  });

  describe('Synchronization Logic', () => {
    beforeEach(() => {
      vi.mocked(ChallengeParticipant.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { studentId: mockStudentId1, handle: 'tourist' },
          { studentId: mockStudentId2, handle: 'newbie' }
        ])
      } as any);
      
      vi.mocked(ContestResult.bulkWrite).mockResolvedValue({} as any);
      vi.mocked(ContestResult.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: new mongoose.Types.ObjectId(), studentId: mockStudentId1 },
          { _id: new mongoose.Types.ObjectId(), studentId: mockStudentId2 }
        ])
      } as any);
      vi.mocked(ContestProblemResult.bulkWrite).mockResolvedValue({} as any);
    });

    it('should mark DidNotParticipate for missing authoritative handles', async () => {
      // Provider returns only tourist, not newbie
      mockProvider.fetchStandings.mockResolvedValue([
        {
          handle: 'tourist',
          rank: 1,
          solvedCount: 5,
          totalProblems: 5,
          penaltySeconds: 1000,
          participationType: 'CONTESTANT',
          problems: []
        }
      ]);

      await ChallengeSyncService.syncChallenge(mockChallengeId);

      const bulkWriteArgs = vi.mocked(ContestResult.bulkWrite).mock.calls[0][0];
      expect(bulkWriteArgs).toHaveLength(2);

      const touristWrite = bulkWriteArgs.find((op: any) => op.updateOne.filter.studentId === mockStudentId1);
      expect(touristWrite.updateOne.update.$set.solvedCount).toBe(5);
      
      const newbieWrite = bulkWriteArgs.find((op: any) => op.updateOne.filter.studentId === mockStudentId2);
      expect(newbieWrite.updateOne.update.$set.participationStatus).toBe('DidNotParticipate');
      expect(newbieWrite.updateOne.update.$set.solvedCount).toBe(0);

      expect(mockChallenge.syncStatus).toBe('Synced');
      expect(mockChallenge.syncAttempts).toBe(0);
    });

    it('should sanitize errors and set Failed on provider throw', async () => {
      mockProvider.fetchStandings.mockRejectedValue(new ProviderError('Rate limited', 'codeforces', 'RATE_LIMITED'));

      await expect(ChallengeSyncService.syncChallenge(mockChallengeId)).rejects.toThrow(ProviderError);

      expect(mockChallenge.syncStatus).toBe('Failed');
      expect(mockChallenge.syncAttempts).toBe(1);
      expect(mockChallenge.lastSyncError).toBe('[RATE_LIMITED] Rate limited');
      
      // Ensure bulkWrite was not called
      expect(ContestResult.bulkWrite).not.toHaveBeenCalled();
    });

    it('should fail on partial persistence error', async () => {
      mockProvider.fetchStandings.mockResolvedValue([
        {
          handle: 'tourist',
          rank: 1,
          solvedCount: 5,
          totalProblems: 5,
          penaltySeconds: 1000,
          participationType: 'CONTESTANT',
          problems: []
        }
      ]);

      vi.mocked(ContestResult.bulkWrite).mockRejectedValue(new Error('MongoDB Connection Lost'));

      await expect(ChallengeSyncService.syncChallenge(mockChallengeId)).rejects.toThrow('MongoDB Connection Lost');

      expect(mockChallenge.syncStatus).toBe('Failed');
      expect(mockChallenge.lastSyncError).toContain('internal error');
    });

    it('should handle multiple participants idempotently', async () => {
      // Upsert:true guarantees idempotency, checking if it was used in bulkWrite
      mockProvider.fetchStandings.mockResolvedValue([
        {
          handle: 'tourist',
          rank: 1,
          solvedCount: 5,
          totalProblems: 5,
          penaltySeconds: 1000,
          participationType: 'CONTESTANT',
          problems: [
             { problemId: 'A', problemName: 'A', solved: true, attempts: 1, penaltySeconds: 500 }
          ]
        }
      ]);

      await ChallengeSyncService.syncChallenge(mockChallengeId);

      const bulkWriteArgs = vi.mocked(ContestResult.bulkWrite).mock.calls[0][0];
      for (const op of bulkWriteArgs) {
        expect(op.updateOne.upsert).toBe(true);
      }

      const probBulkWriteArgs = vi.mocked(ContestProblemResult.bulkWrite).mock.calls[0][0];
      expect(probBulkWriteArgs[0].updateOne.upsert).toBe(true);
      expect(probBulkWriteArgs[0].updateOne.update.$set.problemId).toBeUndefined(); // It's in the filter
    });
  });
});
