import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardService } from '../../src/services/leaderboardService';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { ContestResult } from '../../src/models/ContestResult';
import mongoose from 'mongoose';

vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/models/ContestResult');

describe('LeaderboardService', () => {
  const challengeId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty entries if syncStatus is NotRequired', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'NotRequired',
    } as any);

    const result = await LeaderboardService.getLeaderboard(challengeId);
    expect(result.entries).toEqual([]);
    expect(result.syncStatus).toBe('NotRequired');
    expect(ContestResult.find).not.toHaveBeenCalled();
  });

  it('should rank correctly resolving ties with competition ranking', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'Synced',
    } as any);

    const mockResults = [
      {
        studentId: { name: 'Alice', rollNo: '1' },
        handle: 'alice_cf',
        solvedCount: 5,
        penalty: 100,
        providerRank: 10,
        participationStatus: 'Contestant'
      },
      {
        studentId: { name: 'Bob', rollNo: '2' },
        handle: 'bob_cf',
        solvedCount: 5, // Tie in solved
        penalty: 100,   // Tie in penalty
        providerRank: 11,
        participationStatus: 'Contestant'
      },
      {
        studentId: { name: 'Charlie', rollNo: '3' },
        handle: 'charlie_cf',
        solvedCount: 4,
        penalty: 50,
        providerRank: 20,
        participationStatus: 'Contestant'
      }
    ];

    const sortMock = vi.fn().mockReturnThis();
    const leanMock = vi.fn().mockResolvedValue(mockResults);
    const populateMock = vi.fn().mockReturnValue({ sort: sortMock, lean: leanMock });
    vi.mocked(ContestResult.find).mockReturnValue({ populate: populateMock } as any);

    const result = await LeaderboardService.getLeaderboard(challengeId);
    
    expect(result.entries).toHaveLength(3);
    
    // Alice and Bob should both be rank 1
    expect(result.entries[0].leaderboardRank).toBe(1);
    expect(result.entries[0].name).toBe('Alice');
    
    expect(result.entries[1].leaderboardRank).toBe(1);
    expect(result.entries[1].name).toBe('Bob');

    // Charlie should be rank 3 (since 1, 2 are taken by the tie)
    expect(result.entries[2].leaderboardRank).toBe(3);
    expect(result.entries[2].name).toBe('Charlie');
  });

  it('should safely omit private data from DTO', async () => {
    vi.mocked(CodingChallenge.findById).mockResolvedValue({
      _id: challengeId,
      syncStatus: 'Synced',
    } as any);

    const mockResults = [
      {
        _id: 'secret_mongo_id',
        studentId: { _id: 'student_mongo_id', name: 'Alice', rollNo: '1', email: 'secret@test.com', password: 'hash' },
        handle: 'alice_cf',
        solvedCount: 5,
        penalty: 100,
        providerRank: 10,
        ratingChange: 50,
        participationStatus: 'Contestant'
      }
    ];

    const leanMock = vi.fn().mockResolvedValue(mockResults);
    vi.mocked(ContestResult.find).mockReturnValue({ populate: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: leanMock }) }) } as any);

    const result = await LeaderboardService.getLeaderboard(challengeId);
    
    const entry = result.entries[0] as any;
    expect(entry.name).toBe('Alice');
    expect(entry.email).toBeUndefined();
    expect(entry.password).toBeUndefined();
    expect(entry._id).toBeUndefined(); // DTO strictly mapped
    expect(entry.ratingChange).toBe(50);
  });
});
