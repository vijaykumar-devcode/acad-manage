import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MarkRecord } from '../models/MarkRecord';
import { PublishedResult } from '../models/PublishedResult';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Submission';
import { Quiz } from '../models/Quiz';
import { QuizAttempt } from '../models/QuizAttempt';
import mongoose from 'mongoose';
import { fetchGradeRules, computeGradeFromRules } from '../utils/gradeUtils';

const markEntrySchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(['Internal', 'Mid-Sem', 'End-Sem', 'Lab']),
  marksObtained: z.number().min(0),
  maxMarks: z.number().positive(),
});

const saveMarksSchema = z.object({
  classId: z.string().min(1),
  marks: z.array(markEntrySchema),
});

const bulkMarksSchema = z.object({
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      classId: z.string().min(1),
      type: z.enum(['Internal', 'Mid-Sem', 'End-Sem', 'Lab']),
      marksObtained: z.number().nullable().optional(),
      maxMarks: z.number().positive(),
    })
  ),
});

const importMarksSchema = z.array(
  z.object({
    studentId: z.string().min(1),
    classId: z.string().min(1),
    internalMarks: z.number().nullable().optional(),
    midSemMarks: z.number().nullable().optional(),
    endSemMarks: z.number().nullable().optional(),
    labMarks: z.number().nullable().optional(),
  })
);

export const saveMarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = saveMarksSchema.parse(req.body);
    const user = req.user;

    const classData = await Class.findById(validatedData.classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to save marks for this class');
    }

    // Validate marksObtained <= maxMarks
    for (const mark of validatedData.marks) {
      if (mark.marksObtained > mark.maxMarks) {
        res.status(400);
        throw new Error(`Marks obtained cannot exceed max marks for student ${mark.studentId}`);
      }
    }

    const bulkOps = validatedData.marks.map((mark) => ({
      updateOne: {
        filter: {
          classId: new mongoose.Types.ObjectId(validatedData.classId),
          studentId: new mongoose.Types.ObjectId(mark.studentId),
          type: mark.type,
        },
        update: {
          $set: {
            marksObtained: mark.marksObtained,
            maxMarks: mark.maxMarks,
            status: 'Entered' as 'Entered',
            updatedBy: user!._id,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await MarkRecord.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      message: 'Marks saved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const saveBulkMarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bulkMarksSchema.parse(req.body);
    const user = req.user;

    if (validatedData.records.length === 0) {
      return res.status(200).json({ success: true, message: 'No records to save' });
    }

    const classId = validatedData.records[0].classId;
    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to save marks for this class');
    }

    const bulkOps = [];
    let updatedCount = 0;

    for (const record of validatedData.records) {
      if (record.marksObtained != null && record.marksObtained > record.maxMarks) {
        res.status(400);
        throw new Error(`Marks obtained cannot exceed max marks for student ${record.studentId}`);
      }

      if (record.marksObtained != null) {
        bulkOps.push({
          updateOne: {
            filter: {
              classId: new mongoose.Types.ObjectId(record.classId),
              studentId: new mongoose.Types.ObjectId(record.studentId),
              type: record.type,
            },
            update: {
              $set: {
                marksObtained: record.marksObtained,
                maxMarks: record.maxMarks,
                status: 'Entered' as 'Entered',
                updatedBy: user!._id,
              },
            },
            upsert: true,
          },
        });
        updatedCount++;
      }
    }

    if (bulkOps.length > 0) {
      await MarkRecord.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      message: 'Marks saved successfully',
      data: { updatedCount },
    });
  } catch (error) {
    next(error);
  }
};

export const importMarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = importMarksSchema.parse(req.body);
    const user = req.user;

    if (records.length === 0) {
      return res.status(200).json({ success: true, message: 'No records to save' });
    }

    const classId = records[0].classId;
    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to import marks for this class');
    }

    const bulkOps: Parameters<typeof MarkRecord.bulkWrite>[0] = [];
    let updatedCount = 0;

    // Use class-configured max marks instead of hardcoded values (CQ-010)
    const maxMarks = classData.maxMarks ?? { internal: 20, midSem: 30, endSem: 50, lab: 100 };

    for (const record of records) {
      const types: {
        type: 'Internal' | 'Mid-Sem' | 'End-Sem' | 'Lab';
        marks: number | null | undefined;
        max: number;
      }[] = [
        { type: 'Internal', marks: record.internalMarks, max: maxMarks.internal },
        { type: 'Mid-Sem', marks: record.midSemMarks, max: maxMarks.midSem },
        { type: 'End-Sem', marks: record.endSemMarks, max: maxMarks.endSem },
        { type: 'Lab', marks: record.labMarks, max: maxMarks.lab },
      ];

      for (const t of types) {
        if (t.marks != null) {
          if (t.marks > t.max) {
            res.status(400);
            throw new Error(
              `Marks obtained cannot exceed max marks for student ${record.studentId} (${t.type})`
            );
          }

          bulkOps.push({
            updateOne: {
              filter: {
                classId: new mongoose.Types.ObjectId(classId),
                studentId: new mongoose.Types.ObjectId(record.studentId),
                type: t.type,
              },
              update: {
                $set: {
                  marksObtained: t.marks,
                  maxMarks: t.max,
                  status: 'Entered' as const,
                  updatedBy: user!._id,
                },
              },
              upsert: true,
            },
          });
          updatedCount++;
        }
      }
    }

    if (bulkOps.length > 0) {
      await MarkRecord.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      message: 'Marks imported successfully',
      data: { updatedCount },
    });
  } catch (error) {
    next(error);
  }
};

export const getMarksByClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.query.classId as string;
    const category = req.query.category as string;
    const user = req.user;

    if (!classId) {
      res.status(400);
      throw new Error('classId is required');
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view marks for this class');
    }

    const enrollments = await Enrollment.find({
      classId: new mongoose.Types.ObjectId(classId),
    }).populate('studentId', 'name email rollNo avatarUrl');

    const students = enrollments.map((e) => e.studentId);

    const query: any = { classId: new mongoose.Types.ObjectId(classId) };
    if (category) {
      query.type = category;
    }

    const marks = await MarkRecord.find(query);

    // Fetch assignment marks for this class
    const assignments = await Assignment.find({ classId: new mongoose.Types.ObjectId(classId) });
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });

    // Fetch quiz marks for this class
    const quizzes = await Quiz.find({ classId: new mongoose.Types.ObjectId(classId) });
    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = await QuizAttempt.find({ quizId: { $in: quizIds } });

    const studentExtraMarks: Record<string, any> = {};
    for (const student of students) {
      const sId = (student as any)._id.toString();

      const studentSubmissions = submissions.filter((s) => s.studentId.toString() === sId);
      const totalAssignmentMarks = studentSubmissions.reduce(
        (sum, sub) => sum + (sub.marksObtained || 0),
        0
      );
      const totalAssignmentMax = assignments.reduce((sum, a) => sum + (a.maxMarks || 0), 0);

      const studentQuizAttempts = quizAttempts.filter((q) => q.studentId.toString() === sId);
      const totalQuizMarks = studentQuizAttempts.reduce(
        (sum, attempt) => sum + (attempt.score || 0),
        0
      );
      const totalQuizMax = quizzes.reduce((sum, q) => sum + (q.totalMarks || 0), 0);

      studentExtraMarks[sId] = {
        assignmentMarks: totalAssignmentMarks,
        assignmentMax: totalAssignmentMax,
        quizMarks: totalQuizMarks,
        quizMax: totalQuizMax,
        suggestedInternalScore: totalAssignmentMarks + totalQuizMarks,
        suggestedInternalMax: totalAssignmentMax + totalQuizMax,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        students,
        marks,
        extraMarks: studentExtraMarks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getClassMarks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId as string;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view marks for this class');
    }

    const marks = await MarkRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).populate(
      'studentId',
      'name email rollNo avatarUrl'
    );

    const publishedResult = await PublishedResult.findOne({
      classId: new mongoose.Types.ObjectId(classId),
    });

    res.status(200).json({
      success: true,
      data: {
        marks,
        isPublished: publishedResult?.isPublished || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const togglePublishResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId as string;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to publish results for this class');
    }

    let result = await PublishedResult.findOne({ classId: new mongoose.Types.ObjectId(classId) });

    if (result) {
      result.isPublished = !result.isPublished;
      result.publishedBy = user!._id;
      await result.save();
    } else {
      result = await PublishedResult.create({
        classId: new mongoose.Types.ObjectId(classId),
        semester: classData.semester,
        publishedBy: user!._id,
        isPublished: true,
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: result.isPublished ? 'Results published' : 'Results unpublished',
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentPublishedResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (user?.role !== 'Student') {
      res.status(403);
      throw new Error('Access denied');
    }

    const enrollments = await Enrollment.find({ studentId: user._id });
    const enrolledClassIds = enrollments.map((e) => e.classId);

    const publishedResults = await PublishedResult.find({
      classId: { $in: enrolledClassIds },
      isPublished: true,
    }).populate('classId', 'subjectName subjectCode department semester academicYear avatarUrl');

    const publishedClassIds = publishedResults.map((p) => p.classId._id);

    const markRecords = await MarkRecord.find({
      studentId: user._id,
      classId: { $in: publishedClassIds },
    });

    // CQ-011: Use configurable GradeScale instead of hardcoded thresholds
    const gradeRules = await fetchGradeRules();

    // Group marks by class
    const resultsData = publishedResults.map((pr) => {
      const classMarks = markRecords.filter(
        (m) => m.classId.toString() === pr.classId._id.toString()
      );

      const internal = classMarks.find((m) => m.type === 'Internal');
      const midSem = classMarks.find((m) => m.type === 'Mid-Sem');
      const endSem = classMarks.find((m) => m.type === 'End-Sem');
      const lab = classMarks.find((m) => m.type === 'Lab');

      const totalObtained =
        (internal?.marksObtained || 0) +
        (midSem?.marksObtained || 0) +
        (endSem?.marksObtained || 0) +
        (lab?.marksObtained || 0);
      const totalMax =
        (internal?.maxMarks || 0) +
        (midSem?.maxMarks || 0) +
        (endSem?.maxMarks || 0) +
        (lab?.maxMarks || 0);

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const { grade, status } = computeGradeFromRules(percentage, gradeRules);

      return {
        class: pr.classId,
        semester: pr.semester,
        publishedAt: pr.publishedAt,
        marks: {
          internal,
          midSem,
          endSem,
          lab,
          totalObtained,
          totalMax,
          grade,
          status,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: resultsData,
    });
  } catch (error) {
    next(error);
  }
};
