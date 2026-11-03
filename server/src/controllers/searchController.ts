import { Request, Response, NextFunction } from 'express';
import { Class } from '../models/Class';
import { StudyMaterial } from '../models/StudyMaterial';
import { Assignment } from '../models/Assignment';
import { Quiz } from '../models/Quiz';
import { Enrollment } from '../models/Enrollment';
import { Notice } from '../models/Notice';

/** Escapes special regex characters to prevent ReDoS attacks */
function escapeRegex(str: string): RegExp {
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export const globalSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    const user = req.user;

    if (query && query.length > 0 && query.length < 2) {
      return res.status(200).json({
        success: true,
        data: { classes: [], assignments: [], quizzes: [], materials: [], notices: [] },
      });
    }

    const hasQuery = query && query.length >= 2;
    // Safely escape the query before building a regex
    const regex = hasQuery ? escapeRegex(query) : null;
    let classFilter: Record<string, unknown> = {};
    let scopedClassIds: unknown[] = [];

    // Role-Aware Scoping
    if (user?.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id });
      scopedClassIds = enrollments.map((e) => e.classId);
      classFilter = { _id: { $in: scopedClassIds }, isActive: true };
    } else if (user?.role === 'Faculty') {
      const classes = await Class.find({ facultyId: user._id });
      scopedClassIds = classes.map((c) => c._id);
      classFilter = { facultyId: user._id };
    }

    const classQuery: Record<string, unknown> = { ...classFilter };
    if (hasQuery && regex) {
      classQuery.$or = [{ subjectName: regex }, { subjectCode: regex }];
    }

    const relatedFilter = user?.role === 'Admin' ? {} : { classId: { $in: scopedClassIds } };

    const assignmentQuery: Record<string, unknown> = { ...relatedFilter };
    if (hasQuery && regex) {
      assignmentQuery.$or = [{ title: regex }, { description: regex }];
    }

    const materialQuery: Record<string, unknown> = { ...relatedFilter };
    if (hasQuery && regex) {
      materialQuery.$or = [{ title: regex }, { description: regex }, { tags: { $in: [regex] } }];
    }

    const quizQuery: Record<string, unknown> = { ...relatedFilter };
    if (hasQuery && regex) {
      quizQuery.title = regex;
    }

    const noticeQuery: Record<string, unknown> = { ...relatedFilter };
    if (hasQuery && regex) {
      noticeQuery.$or = [{ title: regex }, { content: regex }];
    }

    // Parallel Execution
    const [classes, assignments, materials, quizzes, notices] = await Promise.all([
      Class.find(classQuery).limit(20).populate('facultyId', 'name avatarUrl'),
      Assignment.find(assignmentQuery).limit(20).populate('classId', 'subjectCode avatarUrl'),
      StudyMaterial.find(materialQuery).limit(20).populate('classId', 'subjectCode avatarUrl'),
      Quiz.find(quizQuery).limit(20).populate('classId', 'subjectCode avatarUrl'),
      Notice.find(noticeQuery).limit(20).populate('classId', 'subjectCode avatarUrl'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        classes,
        assignments,
        materials,
        quizzes,
        notices,
      },
    });
  } catch (error) {
    next(error);
  }
};
