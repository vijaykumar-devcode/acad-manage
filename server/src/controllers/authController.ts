import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start.');
}

const generateToken = (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
  const token = generateToken(user._id.toString());

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // HTTPS in production/staging
    sameSite: 'strict' as const, // Prevents CSRF via cross-site requests
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNo: user.rollNo,
        avatarUrl: user.avatarUrl,
      },
    });
};

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    ),
  role: z.enum(['Admin', 'Faculty', 'Student']),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  rollNo: z.string().optional(),
  semester: z.string().optional(),
  section: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const userExists = await User.findOne({ email: validatedData.email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Faculty accounts require Admin approval before they can log in.
    // isApproved defaults to true in the schema; override it to false for Faculty.
    const isApproved = validatedData.role !== 'Faculty';
    const user = await User.create({ ...validatedData, isApproved });

    if (!isApproved) {
      // Return 202 Accepted — account created but not yet active.
      // Do NOT issue a JWT so the Faculty cannot access the platform.
      res.status(202).json({
        success: true,
        pending: true,
        message:
          'Your Faculty account has been created and is pending Admin approval. You will be able to log in once an Admin approves your account.',
      });
      return;
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Find user and explicitly select password field which is excluded by default
    const user = await User.findOne({ email: validatedData.email }).select('+password');
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Block Faculty accounts that have not been approved by an Admin yet.
    if (user.role === 'Faculty' && !user.isApproved) {
      res.status(403);
      throw new Error('Not permitted, needs Admin approval');
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.user is set in protect middleware
    const user = await User.findById(req.user?.id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNo: user.rollNo,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
