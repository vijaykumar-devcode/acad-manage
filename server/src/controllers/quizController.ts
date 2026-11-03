import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Quiz } from '../models/Quiz';
import { QuizQuestion } from '../models/QuizQuestion';
import { QuizAttempt } from '../models/QuizAttempt';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import mongoose from 'mongoose';
import { computeQuizStatus } from '../utils/quizUtils';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text required'),
  options: z.array(z.string()).length(4, 'Exactly 4 options required'),
  correctOptionIndex: z.number().min(0).max(3),
  marks: z.number().min(0).default(1),
});

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const createQuizSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  subject: z.string().min(1, 'Subject is required'),
  classId: z.string().min(1, 'Class ID is required'),
  durationMinutes: z.number().positive(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  instructions: z.string().optional(),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  totalMarks: z.number().default(0),
  questions: z.array(questionSchema).min(1, 'At least one question required'),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createQuizSchema.parse(req.body);
    const user = req.user;

    const classData = await Class.findById(validatedData.classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to create quiz for this class');
    }

    // Compute status using shared utility (CQ-004)
    const status = computeQuizStatus(
      new Date(validatedData.startTime),
      new Date(validatedData.endTime)
    );

    const quiz = await Quiz.create({
      title: validatedData.title,
      subject: validatedData.subject,
      classId: validatedData.classId,
      facultyId: user?._id,
      durationMinutes: validatedData.durationMinutes,
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      instructions: validatedData.instructions,
      shuffleQuestions: validatedData.shuffleQuestions,
      shuffleOptions: validatedData.shuffleOptions,
      totalMarks: validatedData.totalMarks,
      status,
      iconName: validatedData.iconName,
      iconColor: validatedData.iconColor,
    });

    const questionsToInsert = validatedData.questions.map((q) => ({
      ...q,
      quizId: quiz._id,
    }));

    await QuizQuestion.insertMany(questionsToInsert);

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrolledQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    let filter: any = {};

    if (user?.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id });
      const enrolledClassIds = enrollments.map((e) => e.classId);
      filter.classId = { $in: enrolledClassIds };
    } else if (user?.role === 'Faculty') {
      filter.facultyId = user._id;
    }

    const quizzes = await Quiz.find(filter)
      .sort({ startTime: 1 })
      .populate('classId', 'subjectName subjectCode avatarUrl');

    // Dynamically update and return calculated status using shared utility (CQ-004)
    const updatedQuizzes = quizzes.map((quiz) => {
      const q = quiz.toObject();
      const computedStatus = computeQuizStatus(new Date(q.startTime), new Date(q.endTime));
      q.status = computedStatus;

      if (quiz.status !== computedStatus) {
        quiz.status = computedStatus;
        quiz.save().catch(() => {}); // Fire and forget — sync DB status
      }

      return q;
    });

    res.status(200).json({
      success: true,
      quizzes: updatedQuizzes,
    });
  } catch (error) {
    next(error);
  }
};

export const getClassQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const classId = req.params.classId || req.params.id;

    if (!classId) {
      res.status(400);
      throw new Error('classId is required');
    }

    if (user?.role === 'Student') {
      const isEnrolled = await Enrollment.findOne({ classId, studentId: user._id });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not enrolled in this class');
      }
    } else if (user?.role === 'Faculty') {
      const classData = await Class.findById(classId);
      if (classData && classData.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this class');
      }
    }

    const quizzes = await Quiz.find({ classId })
      .sort({ startTime: 1 })
      .populate('classId', 'subjectName subjectCode avatarUrl');

    // Dynamically update and return calculated status using shared utility (CQ-004)
    const updatedQuizzes = quizzes.map((quiz) => {
      const q = quiz.toObject();
      const computedStatus = computeQuizStatus(new Date(q.startTime), new Date(q.endTime));
      q.status = computedStatus;

      if (quiz.status !== computedStatus) {
        quiz.status = computedStatus;
        quiz.save().catch(() => {}); // Fire and forget — sync DB status
      }

      return q;
    });

    res.status(200).json({
      success: true,
      quizzes: updatedQuizzes,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id;
    const user = req.user;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const isEnrolled = await Enrollment.findOne({ classId: quiz.classId, studentId: user?._id });
    if (!isEnrolled) {
      res.status(403);
      throw new Error('Not enrolled in this class');
    }

    const now = new Date();
    if (now < quiz.startTime) {
      res.status(403);
      throw new Error(
        `This quiz is scheduled to start at ${new Date(quiz.startTime).toLocaleString()}`
      );
    }
    if (now > quiz.endTime) {
      res.status(403);
      throw new Error('Quiz is closed');
    }

    // OMIT correctOptionIndex for students
    let questions: any[] = await QuizQuestion.find({ quizId }).select('-correctOptionIndex').lean();

    // Shuffle questions if enabled
    if (quiz.shuffleQuestions) {
      questions = shuffleArray(questions);
    }

    // Map options to objects and shuffle if enabled
    questions = questions.map((q) => {
      let mappedOptions = q.options.map((text: string, id: number) => ({ id, text }));
      if (quiz.shuffleOptions) {
        mappedOptions = shuffleArray(mappedOptions);
      }
      return { ...q, options: mappedOptions };
    });

    const quizObj = quiz.toObject();
    (quizObj as any).questions = questions;

    res.status(200).json({
      success: true,
      quiz: quizObj,
    });
  } catch (error) {
    next(error);
  }
};

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id as string;
    const validatedData = submitQuizSchema.parse(req.body);
    const user = req.user;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const quizObjectId = new mongoose.Types.ObjectId(quizId);
    const existingAttempt = await QuizAttempt.findOne({
      quizId: quizObjectId,
      studentId: user?._id,
    });
    if (
      existingAttempt &&
      (existingAttempt.status === 'Completed' || existingAttempt.status === 'Evaluated')
    ) {
      res.status(400);
      throw new Error('Quiz already submitted');
    }

    const questions = await QuizQuestion.find({ quizId });

    // Auto-Grading Engine
    let totalScore = 0;
    let totalPossibleMarks = 0;
    const answerMap = new Map<string, number>();

    Object.entries(validatedData.answers).forEach(([questionId, selectedOptionVal]) => {
      const selectedOption = selectedOptionVal as number;
      answerMap.set(questionId, selectedOption);
    });

    questions.forEach((question) => {
      totalPossibleMarks += question.marks;
      if (answerMap.has(question._id.toString())) {
        const selectedOption = answerMap.get(question._id.toString());
        if (question.correctOptionIndex === selectedOption) {
          totalScore += question.marks;
        }
      }
    });

    let attempt;
    if (existingAttempt) {
      existingAttempt.answers = answerMap as any;
      existingAttempt.score = totalScore;
      existingAttempt.totalPossibleMarks = totalPossibleMarks;
      existingAttempt.status = 'Completed';
      existingAttempt.completedAt = new Date();
      attempt = await existingAttempt.save();
    } else {
      attempt = await QuizAttempt.create({
        quizId: quizObjectId,
        studentId: user!._id,
        score: totalScore,
        totalPossibleMarks: totalPossibleMarks,
        answers: answerMap,
        status: 'Completed',
        completedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      attempt,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const quizId = req.params.id as string;

    // SECURITY: Students may only view their own results.
    // Faculty/Admin may supply ?studentId to view a specific student's result.
    const studentIdParam = req.query.studentId as string | undefined;
    const isStudent = user?.role === 'Student';
    const resolvedStudentId = isStudent ? user?._id : (studentIdParam ?? user?._id);

    const quizObjectId = new mongoose.Types.ObjectId(quizId);
    const studentObjectId =
      typeof resolvedStudentId === 'string'
        ? new mongoose.Types.ObjectId(resolvedStudentId)
        : resolvedStudentId;

    let attempt = await QuizAttempt.findOne({
      quizId: quizObjectId,
      studentId: studentObjectId,
    }).populate('quizId');
    const targetQuiz = attempt ? (attempt.quizId as any) : await Quiz.findById(quizObjectId);

    if (!targetQuiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    const now = new Date();

    // Security check: Prevent students from viewing results before the quiz ends
    if (req.user?.role === 'Student' && now <= targetQuiz.endTime) {
      res.status(403);
      throw new Error('Results will be available after the quiz ends');
    }

    if (!attempt) {
      attempt = new QuizAttempt({
        quizId: targetQuiz, // populate directly
        studentId: studentObjectId,
        score: 0,
        totalPossibleMarks: targetQuiz.totalMarks,
        answers: {},
        status: 'Unattempted',
        completedAt: targetQuiz.endTime,
      });
    }

    const quiz = attempt.quizId as any;

    if (req.user?.role === 'Faculty' && quiz.facultyId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this result');
    }

    // Ensure questions are populated for the result view
    const questions = await QuizQuestion.find({ quizId: quizObjectId });

    // Use toJSON to ensure Mongoose Maps are properly converted to plain objects for res.json()
    const attemptWithQuestions = attempt.toJSON ? attempt.toJSON() : { ...attempt };

    // Explicitly attach the quiz object in case toJSON() stripped the populated targetQuiz
    (attemptWithQuestions as any).quiz = {
      _id: quiz._id,
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      totalMarks: quiz.totalMarks,
      classId: quiz.classId,
      questions,
    };

    res.status(200).json({
      success: true,
      attempt: attemptWithQuestions,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuizAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizId = req.params.id as string;
    const user = req.user;

    // SECURITY: Faculty may only view attempts for their own quizzes.
    if (user?.role === 'Faculty') {
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
      }
      if (quiz.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to view attempts for this quiz');
      }
    }

    const attempts = await QuizAttempt.find({ quizId }).populate(
      'studentId',
      'name email _id rollNo avatarUrl'
    );

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    let filter: any = {};

    if (user?.role === 'Student') {
      filter.studentId = user._id;
    } else if (user?.role === 'Faculty') {
      // Find quizzes owned by faculty and then find attempts
      const quizzes = await Quiz.find({ facultyId: user._id });
      const quizIds = quizzes.map((q) => q._id);
      filter.quizId = { $in: quizIds };
    }

    const attempts = await QuizAttempt.find(filter);

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const quizId = req.params.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    if (user?.role === 'Faculty' && quiz.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this quiz');
    }

    await Quiz.findByIdAndDelete(quizId);
    await QuizQuestion.deleteMany({ quizId });
    await QuizAttempt.deleteMany({ quizId });

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const rescheduleQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const quizId = req.params.id;
    const { startTime, endTime, durationMinutes } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    if (user?.role === 'Faculty' && quiz.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to modify this quiz');
    }

    if (startTime) quiz.startTime = new Date(startTime);
    if (endTime) quiz.endTime = new Date(endTime);
    if (durationMinutes !== undefined) quiz.durationMinutes = durationMinutes;

    // Recalculate status
    const now = new Date();
    if (now < quiz.startTime) {
      quiz.status = 'Scheduled';
    } else if (now >= quiz.startTime && now <= quiz.endTime) {
      quiz.status = 'Active';
    } else {
      quiz.status = 'Closed';
    }

    await quiz.save();

    res.status(200).json({
      success: true,
      message: 'Quiz rescheduled successfully',
      quiz,
    });
  } catch (error) {
    next(error);
  }
};
