import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { linkAccount, verifyAccount, getMyAccounts, unlinkAccount } from '../../src/controllers/codingAccountController';
import { StudentCodingAccount } from '../../src/models/StudentCodingAccount';
import { getProvider } from '../../src/providers/registry';
import { ProviderError } from '../../src/providers/types';
import mongoose from 'mongoose';

vi.mock('../../src/models/StudentCodingAccount');
vi.mock('../../src/providers/registry');

describe('codingAccountController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;
  let mockProvider: any;
  const studentId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { _id: studentId, role: 'Student' } as any,
      body: {},
      params: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    next = vi.fn();

    mockProvider = {
      normalizeHandle: vi.fn((h) => h.toLowerCase()),
      fetchUserInfo: vi.fn().mockResolvedValue({ handle: 'test' }),
      capabilities: { verification: true },
      generateVerificationToken: vi.fn().mockReturnValue('campusassess_v_123'),
      getVerificationInstructions: vi.fn().mockReturnValue('Instructions'),
      checkVerification: vi.fn().mockResolvedValue(true)
    };

    vi.mocked(getProvider).mockReturnValue(mockProvider as any);
  });

  describe('linkAccount', () => {
    it('should create an unverified account and return a token if verification is supported', async () => {
      req.body = { platform: 'codeforces', handle: 'TestHandle' };
      
      vi.mocked(StudentCodingAccount.findOne).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      vi.mocked(StudentCodingAccount.create).mockResolvedValue({
        _id: accountId,
        platform: 'codeforces',
        handle: 'testhandle',
        isVerified: false
      } as any);

      await linkAccount(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        verificationToken: 'campusassess_v_123',
        message: expect.stringContaining('Verification required')
      }));
    });

    it('should throw error if already linked platform', async () => {
      req.body = { platform: 'codeforces', handle: 'TestHandle' };
      vi.mocked(StudentCodingAccount.findOne).mockResolvedValueOnce({ _id: accountId } as any);

      await linkAccount(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'You have already linked a codeforces account' }));
    });
  });

  describe('verifyAccount', () => {
    it('should verify account if token matches hash and provider confirms', async () => {
      req.params = { id: accountId.toString() };
      req.body = { token: 'campusassess_v_123' };
      
      // 'campusassess_v_123' hashed with sha256 -> hex
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update('campusassess_v_123').digest('hex');

      const mockAccount = {
        _id: accountId,
        platform: 'codeforces',
        handle: 'testhandle',
        isVerified: false,
        verificationTokenHash: hash,
        verificationTokenExpiresAt: new Date(Date.now() + 10000),
        save: vi.fn().mockResolvedValue(true)
      };

      const selectMock = vi.fn().mockResolvedValue(mockAccount);
      vi.mocked(StudentCodingAccount.findOne).mockReturnValue({ select: selectMock } as any);

      await verifyAccount(req as Request, res as Response, next);

      expect(mockProvider.checkVerification).toHaveBeenCalledWith('testhandle', 'campusassess_v_123');
      expect(mockAccount.isVerified).toBe(true);
      expect(mockAccount.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should reject invalid local token without calling provider', async () => {
      req.params = { id: accountId.toString() };
      req.body = { token: 'wrong_token' };
      
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update('campusassess_v_123').digest('hex');

      const mockAccount = {
        isVerified: false,
        verificationTokenHash: hash,
        verificationTokenExpiresAt: new Date(Date.now() + 10000)
      };

      vi.mocked(StudentCodingAccount.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(mockAccount) } as any);

      await verifyAccount(req as Request, res as Response, next);

      expect(mockProvider.checkVerification).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid verification token provided' }));
    });
  });
});
