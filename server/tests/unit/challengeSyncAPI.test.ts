import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { syncChallengeAPI } from '../../src/controllers/challengeController';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { ChallengeSyncService } from '../../src/services/challengeSyncService';
import mongoose from 'mongoose';
import { ProviderError } from '../../src/providers/types';

vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/services/challengeSyncService');

describe('ChallengeSyncAPI', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;
  
  const mockChallengeId = new mongoose.Types.ObjectId().toString();
  const facultyId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      params: { id: mockChallengeId },
      user: { _id: facultyId, role: 'Faculty', email: 'fac@test.com', name: 'Fac' } as any
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    next = vi.fn();

    vi.mocked(CodingChallenge.findOne).mockResolvedValue({
      _id: mockChallengeId,
      createdBy: facultyId
    } as any);

    vi.mocked(ChallengeSyncService.syncChallenge).mockResolvedValue(undefined);
  });

  it('should validate challengeId as MongoDB ObjectId', async () => {
    req.params!.id = 'invalid-id';
    
    await syncChallengeAPI(req as Request, res as Response, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid challenge ID format' }));
    expect(ChallengeSyncService.syncChallenge).not.toHaveBeenCalled();
  });

  it('should forbid Students from syncing', async () => {
    req.user!.role = 'Student';
    
    await syncChallengeAPI(req as Request, res as Response, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized to sync challenges' }));
  });

  it('should forbid Faculty from syncing challenges they did not create', async () => {
    vi.mocked(CodingChallenge.findOne).mockResolvedValue({
      _id: mockChallengeId,
      createdBy: new mongoose.Types.ObjectId().toString() // Different faculty
    } as any);

    await syncChallengeAPI(req as Request, res as Response, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized to sync this challenge' }));
  });

  it('should allow Admin to sync any challenge', async () => {
    req.user!.role = 'Admin';
    vi.mocked(CodingChallenge.findOne).mockResolvedValue({
      _id: mockChallengeId,
      createdBy: new mongoose.Types.ObjectId().toString() // Some faculty
    } as any);

    await syncChallengeAPI(req as Request, res as Response, next);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Challenge synchronized successfully' });
    expect(ChallengeSyncService.syncChallenge).toHaveBeenCalledWith(mockChallengeId);
  });

  it('should return safe application-level errors and not leak ProviderError', async () => {
    const providerErr = new ProviderError('Upstream is down', 'codeforces', 'UNAVAILABLE');
    vi.mocked(ChallengeSyncService.syncChallenge).mockRejectedValue(providerErr);

    await syncChallengeAPI(req as Request, res as Response, next);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Synchronization failed: [UNAVAILABLE] Upstream is down' }));
  });
});
