import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Class } from '../models/Class';
import { Assignment } from '../models/Assignment';
import { Quiz } from '../models/Quiz';
import { Enrollment } from '../models/Enrollment';
import { Submission } from '../models/Submission';
import { QuizAttempt } from '../models/QuizAttempt';
import { MarkRecord } from '../models/MarkRecord';
import { SupportTicket } from '../models/SupportTicket';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createUserSchema = z.object({
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
  department: z.string().min(2, 'Department is required'),
  rollNo: z.string().optional(),
  semester: z.string().optional(),
  section: z.string().optional(),
  employeeId: z.string().optional(),
  designation: z.string().optional(),
});

const userQuerySchema = z.object({
  search: z.string().optional().default(''),
  role: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getPlatformStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalStudents, totalFaculty, totalClasses, totalAssignments, totalQuizzes] =
      await Promise.all([
        User.countDocuments({ role: 'Student' }),
        User.countDocuments({ role: 'Faculty' }),
        Class.countDocuments(),
        Assignment.countDocuments(),
        Quiz.countDocuments(),
      ]);

    res.json({
      success: true,
      data: {
        students: totalStudents,
        faculty: totalFaculty,
        classes: totalClasses,
        assignments: totalAssignments,
        quizzes: totalQuizzes,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = userQuerySchema.parse(req.query);
    const { search, role, page, limit } = parsed;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (search) {
      // Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      query.$or = [{ name: regex }, { email: regex }, { rollNo: regex }];
    }

    if (role && role !== 'All') {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    const userExists = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      ...validatedData,
      email: validatedData.email.toLowerCase(),
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user && req.user._id.toString() === id) {
      res.status(400);
      throw new Error('Admin cannot delete their own account');
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Cascade cleanup — remove all records associated with this user
    await Promise.all([
      Enrollment.deleteMany({ studentId: id }),
      Submission.deleteMany({ studentId: id }),
      QuizAttempt.deleteMany({ studentId: id }),
      MarkRecord.deleteMany({ studentId: id }),
      SupportTicket.deleteMany({ userId: id }),
    ]);

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'User and all associated data removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/faculty/pending
 * Returns all Faculty accounts that are awaiting Admin approval.
 */
export const getPendingFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await User.find({ role: 'Faculty', isApproved: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: pending, total: pending.length });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/users/:id/approve
 * Approves a Faculty account so the user can log in.
 */
export const approveFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.role !== 'Faculty') {
      res.status(400);
      throw new Error('Only Faculty accounts require approval');
    }

    if (user.isApproved) {
      res.status(400);
      throw new Error('Faculty account is already approved');
    }

    user.isApproved = true;
    await user.save();

    res.json({
      success: true,
      message: `${user.name}'s Faculty account has been approved. They can now log in.`,
      data: { _id: user._id, name: user.name, email: user.email, isApproved: true },
    });
  } catch (error) {
    next(error);
  }
};

