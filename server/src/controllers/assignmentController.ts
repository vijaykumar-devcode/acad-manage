import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Submission';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';

const createAssignmentSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  instructions: z.string().optional(),
  classId: z.string().min(1, 'Class ID is required'),
  dueDate: z.string().or(z.date()),
  maxMarks: z.number().positive(),
  submissionType: z.enum(['Online', 'Offline', 'PDF']),
  attachments: z.array(z.string().url()).optional(),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createAssignmentSchema.parse(req.body);
    const user = req.user;

    const classData = await Class.findById(validatedData.classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to create assignments for this class');
    }

    const assignment = await Assignment.create({
      ...validatedData,
      facultyId: user?._id,
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrolledAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    let filter: any = {};

    if (user.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id });
      const enrolledClassIds = enrollments.map((e) => e.classId);
      filter.classId = { $in: enrolledClassIds };
    } else if (user.role === 'Faculty') {
      filter.facultyId = user._id;
    } else if (user.role === 'Admin') {
      // Admin gets all by default here unless scoped
    }

    const assignments = await Assignment.find(filter)
      .sort({ dueDate: 1 })
      .populate('classId', 'subjectName subjectCode avatarUrl');

    let dataToReturn: any[] = assignments;
    if (user.role === 'Student') {
      const submissions = await Submission.find({ studentId: user._id });
      dataToReturn = assignments.map((a) => {
        const sub = submissions.find((s) => s.assignmentId.toString() === a._id.toString());
        return {
          ...a.toObject(),
          submission: sub || null,
        };
      });
    }

    res.status(200).json({
      success: true,
      data: dataToReturn,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassAssignments = async (req: Request, res: Response, next: NextFunction) => {
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

    const query = {
      $or: [{ classId: classId }, { class: classId }],
    };

    const assignments = await Assignment.find(query)
      .sort({ dueDate: 1 })
      .populate('classId', 'subjectName subjectCode avatarUrl');

    let dataToReturn: any[] = assignments;
    if (user.role === 'Student') {
      const submissions = await Submission.find({ studentId: user._id });
      dataToReturn = assignments.map((a) => {
        const sub = submissions.find((s) => s.assignmentId.toString() === a._id.toString());
        return {
          ...a.toObject(),
          submission: sub || null,
        };
      });
    }

    res.status(200).json({
      success: true,
      data: dataToReturn,
    });
  } catch (error) {
    next(error);
  }
};

const submitAssignmentSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  gDriveUrl: z.string().url().optional(),
});

export const submitAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = submitAssignmentSchema.parse(req.body);
    const user = req.user;

    const assignment = await Assignment.findById(validatedData.assignmentId);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    const isEnrolled = await Enrollment.findOne({
      classId: assignment.classId,
      studentId: user?._id,
    });
    if (!isEnrolled) {
      res.status(403);
      throw new Error('Not enrolled in this class');
    }

    if (assignment.submissionType === 'Offline') {
      res.status(400);
      throw new Error('Offline assignments must be submitted in class.');
    }

    if (assignment.submissionType === 'Online' && !validatedData.gDriveUrl) {
      res.status(400);
      throw new Error('gDriveUrl is required for Online submissions');
    }

    let gDriveFileId = undefined;
    if (validatedData.gDriveUrl) {
      const match = validatedData.gDriveUrl.match(/[-\w]{25,}/);
      if (match) {
        gDriveFileId = match[0];
      }
    }

    // Determine if submission is late — late submissions are still accepted but flagged
    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: user?._id },
      {
        assignmentId: assignment._id,
        studentId: user?._id,
        gDriveUrl: validatedData.gDriveUrl,
        gDriveFileId,
        status: isLate ? 'Late' : 'Submitted',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

const evaluateSubmissionSchema = z.object({
  marksObtained: z.number().min(0),
  feedback: z.string().optional(),
});

export const evaluateSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.id;
    const validatedData = evaluateSubmissionSchema.parse(req.body);
    const user = req.user;

    const submission = await Submission.findById(submissionId).populate('assignmentId');
    if (!submission) {
      res.status(404);
      throw new Error('Submission not found');
    }

    const assignment = submission.assignmentId as any;

    if (user?.role === 'Faculty' && assignment.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to evaluate this submission');
    }

    if (validatedData.marksObtained > assignment.maxMarks) {
      res.status(400);
      throw new Error(`Marks cannot exceed the maximum marks (${assignment.maxMarks})`);
    }

    submission.marksObtained = validatedData.marksObtained;
    submission.feedback = validatedData.feedback;
    submission.status = 'Evaluated';
    await submission.save();

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

const updateAssignmentSchema = createAssignmentSchema.partial();

export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateAssignmentSchema.parse(req.body);
    const user = req.user;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    if (user?.role === 'Faculty' && assignment.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this assignment');
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(req.params.id, validatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    if (user?.role === 'Faculty' && assignment.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this assignment');
    }

    // Delete associated submissions
    await Submission.deleteMany({ assignmentId: assignment._id });
    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getEvaluations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (user?.role !== 'Faculty') {
      res.status(403);
      throw new Error('Not authorized');
    }

    const assignments = await Assignment.find({ facultyId: user._id });

    if (assignments.length === 0) {
      return res.status(200).json([]);
    }

    // CQ-006: replaced N+1 loop with two bulk queries
    const assignmentIds = assignments.map((a) => a._id);
    const classIds = [...new Set(assignments.map((a) => String(a.classId)))];

    const [allEnrollments, allSubmissions] = await Promise.all([
      Enrollment.find({ classId: { $in: classIds } }).populate({
        path: 'studentId',
        select: 'name rollNo email avatarUrl',
      }),
      Submission.find({ assignmentId: { $in: assignmentIds } }),
    ]);

    // Build a lookup map: "assignmentId:studentId" → submission
    const submissionMap = new Map<string, (typeof allSubmissions)[number]>();
    for (const sub of allSubmissions) {
      submissionMap.set(`${sub.assignmentId}:${sub.studentId}`, sub);
    }

    // Group enrollments by classId for fast lookup
    const enrollmentsByClass = new Map<string, typeof allEnrollments>();
    for (const enrollment of allEnrollments) {
      const key = String(enrollment.classId);
      if (!enrollmentsByClass.has(key)) enrollmentsByClass.set(key, []);
      enrollmentsByClass.get(key)!.push(enrollment);
    }

    const evaluationData: {
      assignment: (typeof assignments)[number];
      student: unknown;
      submission: unknown;
    }[] = [];

    for (const assignment of assignments) {
      const classEnrollments = enrollmentsByClass.get(String(assignment.classId)) ?? [];

      for (const enrollment of classEnrollments) {
        const student = enrollment.studentId as unknown as { _id: string };
        if (!student) continue;

        const submission = submissionMap.get(`${assignment._id}:${student._id}`);

        if (assignment.submissionType === 'Offline') {
          evaluationData.push({
            assignment,
            student,
            submission: submission ?? {
              _id: `offline-pending-${student._id}-${assignment._id}`,
              assignmentId: assignment._id,
              studentId: student._id,
              status: 'Pending',
              submittedAt: new Date().toISOString(),
            },
          });
        } else {
          if (submission) {
            evaluationData.push({ assignment, student, submission });
          }
        }
      }
    }

    res.status(200).json(evaluationData);
  } catch (error) {
    next(error);
  }
};

const evaluateOfflineSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['Submitted', 'Evaluated', 'Pending', 'Late']).optional(),
  marksObtained: z.number().min(0).optional(),
  feedback: z.string().optional(),
});

export const evaluateOfflineSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignmentId = req.params.id;
    const validatedData = evaluateOfflineSchema.parse(req.body);
    const user = req.user;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    if (user?.role === 'Faculty' && assignment.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized');
    }

    if (
      validatedData.marksObtained !== undefined &&
      validatedData.marksObtained > assignment.maxMarks
    ) {
      res.status(400);
      throw new Error(`Marks cannot exceed the maximum marks (${assignment.maxMarks})`);
    }

    // Upsert submission
    const submission = await Submission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: validatedData.studentId },
      {
        $set: {
          status: validatedData.status || 'Evaluated',
          marksObtained: validatedData.marksObtained,
          feedback: validatedData.feedback,
          evaluatedAt: new Date(),
        },
        $setOnInsert: {
          assignmentId: assignment._id,
          studentId: validatedData.studentId,
          submittedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

const bulkEvaluateSchema = z.array(
  z.object({
    submissionId: z.string().optional(),
    studentId: z.string(),
    assignmentId: z.string(),
    marksObtained: z.number().min(0).optional(),
    feedback: z.string().optional(),
    status: z.enum(['Submitted', 'Evaluated', 'Pending', 'Late']).optional(),
  })
);

export const bulkEvaluateSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = bulkEvaluateSchema.parse(req.body);
    const user = req.user;

    if (user?.role !== 'Faculty' && user?.role !== 'Admin') {
      res.status(403);
      throw new Error('Not authorized');
    }

    // CQ-007: Pre-fetch all unique assignments in a single query
    const uniqueAssignmentIds = [...new Set(validatedData.map((e) => e.assignmentId))];
    const assignments = await Assignment.find({ _id: { $in: uniqueAssignmentIds } });
    const assignmentMap = new Map(assignments.map((a) => [String(a._id), a]));

    // Validate all marks before performing any writes
    for (const evalItem of validatedData) {
      const assignment = assignmentMap.get(evalItem.assignmentId);
      if (!assignment) {
        res.status(404);
        throw new Error(`Assignment ${evalItem.assignmentId} not found`);
      }
      if (evalItem.marksObtained !== undefined && evalItem.marksObtained > assignment.maxMarks) {
        throw new Error(
          `Marks for student ${evalItem.studentId} cannot exceed maximum marks (${assignment.maxMarks})`
        );
      }
    }

    // Process all upserts in parallel
    const updates = validatedData.map((evalItem) => {
      const assignment = assignmentMap.get(evalItem.assignmentId)!;
      return Submission.findOneAndUpdate(
        { assignmentId: assignment._id, studentId: evalItem.studentId },
        {
          $set: {
            status: evalItem.status ?? 'Evaluated',
            marksObtained: evalItem.marksObtained,
            feedback: evalItem.feedback,
            evaluatedAt: new Date(),
          },
          $setOnInsert: {
            assignmentId: assignment._id,
            studentId: evalItem.studentId,
            submittedAt: new Date(),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    });

    const results = await Promise.all(updates);

    res.status(200).json({
      success: true,
      data: results,
      message: 'Bulk evaluation saved successfully',
    });
  } catch (error) {
    next(error);
  }
};
