import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { StudentCodingAccount } from '../models/StudentCodingAccount';
import { getProvider } from '../providers/registry';
import { supportsVerification, ProviderError, SUPPORTED_PLATFORMS } from '../providers/types';

const linkAccountSchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS as any),
  handle: z.string().min(1).max(255).trim(),
});

export const linkAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { platform, handle } = linkAccountSchema.parse(req.body);

    const existingPlatform = await StudentCodingAccount.findOne({
      studentId: user._id,
      platform,
    });
    if (existingPlatform) {
      res.status(400);
      throw new Error(`You have already linked a ${platform} account`);
    }

    const provider = getProvider(platform);
    const normalizedHandle = provider.normalizeHandle(handle);

    const claimedAccount = await StudentCodingAccount.findOne({
      platform,
      handle: normalizedHandle,
    });
    if (claimedAccount) {
      res.status(400);
      throw new Error(`The handle ${normalizedHandle} is already claimed on ${platform}`);
    }

    try {
      const userInfo = await provider.fetchUserInfo(normalizedHandle);
      if (!userInfo) {
        res.status(404);
        throw new Error(`Handle ${normalizedHandle} not found on ${platform}`);
      }
    } catch (error) {
      res.status(400);
      if (error instanceof ProviderError) {
        throw new Error(`Verification failed: ${error.message}`);
      }
      throw new Error('Failed to fetch user info from platform');
    }

    let isVerified = true;
    let verificationToken = undefined;
    let verificationTokenHash = undefined;
    let verificationTokenExpiresAt = undefined;
    let verificationInstructions = undefined;

    if (supportsVerification(provider)) {
      isVerified = false;
      verificationToken = provider.generateVerificationToken();
      verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      verificationInstructions = provider.getVerificationInstructions(verificationToken);
    }

    const account = await StudentCodingAccount.create({
      studentId: user._id,
      platform,
      handle: normalizedHandle,
      handleRaw: handle,
      isVerified,
      verificationTokenHash,
      verificationTokenExpiresAt,
      verifiedAt: isVerified ? new Date() : undefined,
    });

    res.status(201).json({
      success: true,
      message: isVerified
        ? 'Account linked and verified successfully'
        : 'Account linked. Verification required.',
      data: {
        _id: account._id,
        platform: account.platform,
        handle: account.handle,
        isVerified: account.isVerified,
      },
      verificationToken,
      verificationInstructions,
    });
  } catch (error) {
    next(error);
  }
};

const verifyAccountSchema = z.object({
  token: z.string().min(1),
});

export const verifyAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const accountId = req.params.id;
    const { token } = verifyAccountSchema.parse(req.body);

    const account = await StudentCodingAccount.findOne({
      _id: accountId,
      studentId: user._id,
    }).select('+verificationTokenHash +verificationTokenExpiresAt');

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    if (account.isVerified) {
      res.status(400);
      throw new Error('Account is already verified');
    }

    if (!account.verificationTokenHash) {
      res.status(400);
      throw new Error('No verification token found for this account');
    }

    if (account.verificationTokenExpiresAt && account.verificationTokenExpiresAt < new Date()) {
      res.status(400);
      throw new Error('Verification token has expired. Please unlink and link again.');
    }

    const providedHash = crypto.createHash('sha256').update(token).digest('hex');
    if (providedHash !== account.verificationTokenHash) {
      res.status(400);
      throw new Error('Invalid verification token provided');
    }

    const provider = getProvider(account.platform);
    if (!supportsVerification(provider)) {
      res.status(400);
      throw new Error(`Verification not supported for ${account.platform}`);
    }

    const isUpstreamVerified = await provider.checkVerification(account.handle, token);
    if (!isUpstreamVerified) {
      res.status(400);
      throw new Error(
        'Token not found on your upstream profile. Please ensure you saved it correctly.'
      );
    }

    account.isVerified = true;
    account.verificationTokenHash = undefined;
    account.verificationTokenExpiresAt = undefined;
    account.verifiedAt = new Date();
    await account.save();

    res.status(200).json({
      success: true,
      message: 'Account successfully verified',
      data: {
        _id: account._id,
        platform: account.platform,
        handle: account.handle,
        isVerified: account.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const accounts = await StudentCodingAccount.find({ studentId: user._id }).select(
      '-verificationTokenHash'
    );

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const unlinkAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const accountId = req.params.id;

    const account = await StudentCodingAccount.findOneAndDelete({
      _id: accountId,
      studentId: user._id,
    });

    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({
      success: true,
      message: 'Account unlinked successfully',
    });
  } catch (error) {
    next(error);
  }
};
