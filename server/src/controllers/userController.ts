import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const userProfile = await User.findById(user._id).select('-password');
    if (!userProfile) {
      res.status(404);
      throw new Error('User not found');
    }

    // Calculate completion percentage
    let totalFields = 0;
    let filledFields = 0;

    const commonFields = ['name', 'email', 'phoneNumber', 'department', 'avatarUrl'];
    const studentFields = ['rollNo', 'semester', 'section'];
    const facultyFields = ['employeeId', 'designation', 'officeLocation'];

    const checkFields = (fields: string[]) => {
      fields.forEach((field) => {
        totalFields++;
        if ((userProfile as any)[field]) filledFields++;
      });
    };

    checkFields(commonFields);

    if (userProfile.role === 'Student') {
      checkFields(studentFields);
    } else if (userProfile.role === 'Faculty') {
      checkFields(facultyFields);
    }

    const completionPercentage =
      totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        ...userProfile.toObject(),
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const allowedUpdates = [
      'name',
      'phoneNumber',
      'department',
      'rollNo',
      'semester',
      'section',
      'employeeId',
      'designation',
      'officeLocation',
    ];

    const updates: any = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Validate avatarUrl — must be a proper HTTPS URL to prevent XSS via javascript: or data: URIs
    const avatarSchema = z
      .string()
      .url('avatarUrl must be a valid URL')
      .refine((url) => url.startsWith('https://'), {
        message: 'avatarUrl must use HTTPS',
      });

    const parseResult = avatarSchema.safeParse(req.body.avatarUrl);
    if (!parseResult.success) {
      res.status(400);
      throw new Error(parseResult.error.issues[0]?.message ?? 'Invalid avatarUrl');
    }

    const avatarUrl = parseResult.data;

    const updatedUser = await User.findByIdAndUpdate(user._id, { avatarUrl }, { new: true }).select(
      '-password'
    );

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
