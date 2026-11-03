import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PYQ } from '../models/PYQ';

// ─── Validation ───────────────────────────────────────────────────────────────

const createPYQSchema = z.object({
  department: z.string().min(1, 'Department is required'),
  semester: z.string().min(1, 'Semester is required'),
  subjectName: z.string().min(1, 'Subject Name is required'),
  subjectCode: z.string().min(1, 'Subject Code is required'),
  academicYear: z.string().min(4, 'Academic Year is required'),
  examType: z.enum(['Mid Semester', 'End Semester', 'Internal', 'Other']),
  description: z.string().optional(),
  gDriveUrl: z.string().url('Must be a valid URL'),
  fileType: z.enum(['PDF', 'DOC', 'ZIP', 'Other']).default('PDF'),
});

/** Escapes special regex characters to prevent ReDoS attacks */
function escapeRegex(str: string): RegExp {
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getPYQs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { department, semester, subject, academicYear, examType, search } = req.query;

    const filter: Record<string, unknown> = {};

    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;

    if (subject || search) {
      const q = (subject || search) as string;
      // Escape the search string before building a regex to prevent ReDoS
      const safeRegex = escapeRegex(q);
      filter.$or = [
        { subjectName: safeRegex },
        { subjectCode: safeRegex },
        { description: safeRegex },
      ];
    }

    const pyqs = await PYQ.find(filter)
      .populate('facultyId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: pyqs });
  } catch (error) {
    next(error);
  }
};

export const createPYQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'Faculty') {
      res.status(403);
      throw new Error('Not authorized to upload PYQs');
    }

    const validatedData = createPYQSchema.parse(req.body);

    const newPYQ = await PYQ.create({
      ...validatedData,
      facultyId: user._id,
    });

    res.status(201).json({ success: true, data: newPYQ });
  } catch (error) {
    next(error);
  }
};

export const deletePYQ = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const pyqId = req.params.id;

    const pyq = await PYQ.findById(pyqId);
    if (!pyq) {
      res.status(404);
      throw new Error('PYQ not found');
    }

    if (user?.role !== 'Admin' && pyq.facultyId.toString() !== user?._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this PYQ');
    }

    await pyq.deleteOne();

    res.status(200).json({ success: true, message: 'PYQ deleted successfully' });
  } catch (error) {
    next(error);
  }
};
