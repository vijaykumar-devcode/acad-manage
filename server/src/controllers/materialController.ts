import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StudyMaterial } from '../models/StudyMaterial';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';

// ─── Validation ───────────────────────────────────────────────────────────────

const createMaterialSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  classId: z.string().min(1, 'Class ID is required'),
  gDriveUrl: z.string().url('Must be a valid URL'),
  fileType: z.enum(['PDF', 'DOC', 'PPT', 'ZIP', 'Code']),
  fileSize: z.string().min(1, 'File size is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

/** Escapes special regex characters to prevent ReDoS attacks */
function escapeRegex(str: string): RegExp {
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const createMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createMaterialSchema.parse(req.body);
    const user = req.user;

    // Verify class exists
    const classData = await Class.findById(validatedData.classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Verify faculty owns this class (or is admin)
    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to add material to this class');
    }

    // Extract gDriveFileId from URL (optional utility step)
    let gDriveFileId: string | undefined;
    const match = validatedData.gDriveUrl.match(/[-\w]{25,}/);
    if (match) {
      gDriveFileId = match[0];
    }

    const newMaterial = await StudyMaterial.create({
      ...validatedData,
      gDriveFileId,
      facultyId: user?._id,
    });

    res.status(201).json({
      success: true,
      data: newMaterial,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrolledMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const { q } = req.query;
    let scopeFilter: Record<string, unknown> = {};
    let scopeOr: Record<string, unknown>[] = [];

    // Role-Aware Scoping
    if (user.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id });
      const enrolledClassIds = enrollments.map((e) => e.classId);
      scopeFilter = { classId: { $in: enrolledClassIds } };
    } else if (user.role === 'Faculty') {
      const myClasses = await Class.find({ facultyId: user._id });
      const myClassIds = myClasses.map((c) => c._id);
      scopeOr = [{ facultyId: user._id }, { classId: { $in: myClassIds } }];
    }
    // Admin: no scope filter — sees everything

    let filter: Record<string, unknown>;

    if (q) {
      // Escape the search string before building a regex to prevent ReDoS
      const safeRegex = escapeRegex(q as string);
      const searchOr = [
        { title: safeRegex },
        { description: safeRegex },
        { tags: { $in: [safeRegex] } },
      ];

      if (scopeOr.length > 0) {
        // Combine scope filter with search using $and
        filter = { $and: [{ $or: scopeOr }, { $or: searchOr }] };
      } else if (Object.keys(scopeFilter).length > 0) {
        filter = { ...scopeFilter, $or: searchOr };
      } else {
        filter = { $or: searchOr };
      }
    } else {
      filter = scopeOr.length > 0 ? { $or: scopeOr } : scopeFilter;
    }

    const materials = await StudyMaterial.find(filter)
      .sort({ createdAt: -1 })
      .populate('classId', 'subjectName subjectCode semester avatarUrl')
      .populate('facultyId', 'name email avatarUrl');

    res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const classId = req.params.classId || req.params.id;
    if (!classId) {
      res.status(400);
      throw new Error('classId is required');
    }

    // Access check
    if (user.role === 'Student') {
      const isEnrolled = await Enrollment.findOne({ classId, studentId: user._id });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not enrolled in this class');
      }
    } else if (user.role === 'Faculty') {
      const classData = await Class.findById(classId);
      if (classData && classData.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this class');
      }
    }

    const materials = await StudyMaterial.find({ classId })
      .sort({ createdAt: -1 })
      .populate('classId', 'subjectName subjectCode semester avatarUrl')
      .populate('facultyId', 'name email avatarUrl');

    res.status(200).json({
      success: true,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materialId = req.params.id;
    const user = req.user;

    const material = await StudyMaterial.findById(materialId)
      .populate('classId', 'subjectName subjectCode facultyId avatarUrl')
      .populate('facultyId', 'name avatarUrl');

    if (!material) {
      res.status(404);
      throw new Error('Study material not found');
    }

    // Access Verification
    if (user?.role === 'Student') {
      const isEnrolled = await Enrollment.findOne({
        classId: material.classId._id,
        studentId: user._id,
      });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not authorized to access material for this class');
      }
    } else if (user?.role === 'Faculty') {
      if (material.facultyId._id.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this material');
      }
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materialId = req.params.id;
    const user = req.user;

    const material = await StudyMaterial.findById(materialId);

    if (!material) {
      res.status(404);
      throw new Error('Study material not found');
    }

    // Verify faculty ownership or admin
    if (user?.role === 'Faculty' && material.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this material');
    }

    await material.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Study material deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
