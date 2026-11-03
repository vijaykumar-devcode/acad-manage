import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../src/services/analyticsService';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { ChallengeParticipant } from '../../src/models/ChallengeParticipant';
import { ContestResult } from '../../src/models/ContestResult';
import { ContestProblemResult } from '../../src/models/ContestProblemResult';
import mongoose from 'mongoose';

vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/models/ChallengeParticipant');
vi.mock('../../src/models/ContestResult');
vi.mock('../../src/models/ContestProblemResult');

describe('AnalyticsService', () => {
  const challengeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 for metrics if not synced yet', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'Pending',
    } as any);

    vi.mocked(ChallengeParticipant.countDocuments).mockResolvedValue(10);

    const result = await AnalyticsService.getChallengeAnalytics(challengeId);
    
    expect(result.syncStatus).toBe('Pending');
    expect(result.totalRegistered).toBe(10);
    expect(result.totalParticipants).toBe(0);
    expect(result.participationRate).toBe(0);
    expect(ContestResult.find).not.toHaveBeenCalled();
  });

  it('should calculate overall metrics correctly', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'Synced',
    } as any);

    vi.mocked(ChallengeParticipant.countDocuments).mockResolvedValue(4); // 4 registered

    vi.mocked(ContestResult.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { solvedCount: 5, penalty: 100, participationStatus: 'Contestant' },
        { solvedCount: 3, penalty: 200, participationStatus: 'Contestant' },
        { solvedCount: 0, penalty: 0, participationStatus: 'DidNotParticipate' },
        { solvedCount: 4, penalty: 150, participationStatus: 'Out of Competition' }, // still a participant
      ])
    } as any);

    vi.mocked(ContestProblemResult.aggregate).mockResolvedValue([]);

    const result = await AnalyticsService.getChallengeAnalytics(challengeId);

    expect(result.totalRegistered).toBe(4);
    expect(result.totalParticipants).toBe(3); // 3 participated
    expect(result.totalNonParticipants).toBe(1); // 1 DNP
    expect(result.participationRate).toBe(0.75);
    expect(result.averageSolvedCount).toBe((5 + 3 + 4) / 3);
    expect(result.maxSolvedCount).toBe(5);
    expect(result.averagePenalty).toBe((100 + 200 + 150) / 3);
  });

  it('should calculate problem metrics correctly', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'Synced',
    } as any);

    vi.mocked(ChallengeParticipant.countDocuments).mockResolvedValue(2);
    vi.mocked(ContestResult.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);

    vi.mocked(ContestProblemResult.aggregate).mockResolvedValue([
      {
        _id: 'A',
        problemName: 'Problem A',
        totalAttempts: 5,
        solvedCount: 3,
        attemptedCount: 4
      },
      {
        _id: 'B',
        problemName: 'Problem B',
        totalAttempts: 2,
        solvedCount: 0,
        attemptedCount: 1
      }
    ]);

    const result = await AnalyticsService.getChallengeAnalytics(challengeId);

    expect(result.problemMetrics).toHaveLength(2);
    expect(result.problemMetrics[0].solveRate).toBe(3 / 4);
    expect(result.problemMetrics[1].solveRate).toBe(0); // 0 / 1
  });
});
