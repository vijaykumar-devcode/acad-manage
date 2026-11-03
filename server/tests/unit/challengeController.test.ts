import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createChallenge, publishChallenge, updateChallenge, deleteChallenge, listChallenges, getChallengeById, registerForChallenge } from '../../src/controllers/challengeController';
import { CodingChallenge } from '../../src/models/CodingChallenge';
import { Class } from '../../src/models/Class';
import { Enrollment } from '../../src/models/Enrollment';
import { StudentCodingAccount } from '../../src/models/StudentCodingAccount';
import { ChallengeParticipant } from '../../src/models/ChallengeParticipant';
import mongoose from 'mongoose';

// Mock models
vi.mock('../../src/models/CodingChallenge');
vi.mock('../../src/models/Class');
vi.mock('../../src/models/Enrollment');
vi.mock('../../src/models/StudentCodingAccount');
vi.mock('../../src/models/ChallengeParticipant');

describe('Challenge Controller API', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    req = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: new mongoose.Types.ObjectId() as any,
        role: 'Faculty',
      } as any,
    };
  });

  describe('createChallenge (Role Escalation / Authorization)', () => {
    it('should reject creation if faculty does not own the class', async () => {
      req.body = {
        title: 'Test',
        platform: 'codeforces',
        externalContestId: '123',
        externalUrl: 'http://test.com',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000),
        classId: new mongoose.Types.ObjectId().toString(),
      };

      vi.mocked(Class.findById).mockResolvedValue({
        facultyId: new mongoose.Types.ObjectId(), // Different faculty
      } as any);

      await createChallenge(req as Request, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized to create challenge for this class' }));
    });
  });

  describe('updateChallenge (Mutability after participants)', () => {
    it('should reject modification of immutable fields if participants exist', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.body = { externalContestId: 'new_id_999' }; // Immutable field

      vi.mocked(CodingChallenge.findOne).mockResolvedValue({
        createdBy: req.user!._id,
        participantCount: 5,
        platform: 'codeforces',
        externalContestId: 'old_id_123',
      } as any);

      await updateChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Cannot modify externalContestId') }));
    });
  });

  describe('deleteChallenge (Soft Delete / Archive)', () => {
    it('should soft delete by setting isActive to false', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      
      const mockChallenge = {
        createdBy: req.user!._id,
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(CodingChallenge.findOne).mockResolvedValue(mockChallenge as any);

      await deleteChallenge(req as Request, res as Response, next);

      expect(mockChallenge.isActive).toBe(false);
      expect(mockChallenge.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listChallenges (Pagination & Visibility)', () => {
    it('should enforce pagination boundaries and return pages', async () => {
      req.query = { page: '1', limit: '5' };
      
      vi.mocked(CodingChallenge.countDocuments).mockResolvedValue(12);
      
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CodingChallenge.find).mockReturnValue(mockFind as any);

      await listChallenges(req as Request, res as Response, next);

      expect(mockFind.skip).toHaveBeenCalledWith(0);
      expect(mockFind.limit).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        total: 12,
        page: 1,
        pages: 3
      }));
    });
  });

  describe('getChallengeById (IDOR & Visibility)', () => {
    it('should prevent student from viewing draft challenge', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      vi.mocked(CodingChallenge.findOne).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          publicationStatus: 'Draft'
        })
      } as any);

      await getChallengeById(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not authorized to view draft challenges' }));
    });

    it('should prevent student from viewing challenge for a class they are not enrolled in', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      vi.mocked(CodingChallenge.findOne).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          publicationStatus: 'Published',
          classId: new mongoose.Types.ObjectId()
        })
      } as any);

      vi.mocked(Enrollment.findOne).mockResolvedValue(null); // Not enrolled

      await getChallengeById(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Not enrolled in the class for this challenge' }));
    });
  });

  describe('registerForChallenge (Timing, Accounts, Duplicates)', () => {
    it('should reject registration if challenge is Ended', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      vi.mocked(CodingChallenge.findOne).mockResolvedValue({
        publicationStatus: 'Published',
        startTime: new Date(Date.now() - 20000),
        endTime: new Date(Date.now() - 10000), // Ended
      } as any);

      await registerForChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Cannot register') }));
    });

    it('should reject if account is unverified', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      vi.mocked(CodingChallenge.findOne).mockResolvedValue({
        publicationStatus: 'Published',
        platform: 'codeforces',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000), // Upcoming
      } as any);

      vi.mocked(StudentCodingAccount.findOne).mockResolvedValue(null); // Unverified/Not found

      await registerForChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Verified coding account') }));
    });

    it('should handle duplicate participation atomically', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      vi.mocked(CodingChallenge.findOne).mockResolvedValue({
        _id: req.params.id,
        publicationStatus: 'Published',
        platform: 'codeforces',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000),
      } as any);

      vi.mocked(StudentCodingAccount.findOne).mockResolvedValue({ handle: 'tourist', isVerified: true } as any);

      const dupError = new Error('Duplicate key');
      (dupError as any).code = 11000;
      vi.mocked(ChallengeParticipant.create).mockRejectedValue(dupError);

      await registerForChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Already registered for this challenge' }));
    });

    it('should allow registration at Upcoming boundary', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      const mockChallenge = {
        _id: req.params.id,
        publicationStatus: 'Published',
        platform: 'codeforces',
        startTime: new Date(Date.now() + 10000),
        endTime: new Date(Date.now() + 20000), // Upcoming
        participantCount: 0,
        save: vi.fn(),
      };
      vi.mocked(CodingChallenge.findOne).mockResolvedValue(mockChallenge as any);
      vi.mocked(StudentCodingAccount.findOne).mockResolvedValue({ handle: 'tourist', isVerified: true } as any);
      vi.mocked(ChallengeParticipant.create).mockResolvedValue({} as any);

      await registerForChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockChallenge.participantCount).toBe(1);
    });

    it('should allow registration at Active boundary', async () => {
      req.params = { id: new mongoose.Types.ObjectId().toString() };
      req.user = { _id: new mongoose.Types.ObjectId(), role: 'Student' } as any;

      const mockChallenge = {
        _id: req.params.id,
        publicationStatus: 'Published',
        platform: 'codeforces',
        startTime: new Date(Date.now() - 10000),
        endTime: new Date(Date.now() + 20000), // Active
        participantCount: 0,
        save: vi.fn(),
      };
      vi.mocked(CodingChallenge.findOne).mockResolvedValue(mockChallenge as any);
      vi.mocked(StudentCodingAccount.findOne).mockResolvedValue({ handle: 'tourist', isVerified: true } as any);
      vi.mocked(ChallengeParticipant.create).mockResolvedValue({} as any);

      await registerForChallenge(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
