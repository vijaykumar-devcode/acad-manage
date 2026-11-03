import { Request, Response, NextFunction } from 'express';
import { MarkRecord } from '../models/MarkRecord';
import { PublishedResult } from '../models/PublishedResult';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';

export const getResultsForClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId || req.params.id;
    if (!classId) {
      res.status(400);
      throw new Error('classId is required');
    }

    const classData = await Class.findById(classId).populate(
      'facultyId',
      'name email employeeId designation avatarUrl'
    );
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // CQ-012: removed legacy {class: classId} $or pattern — classId is the canonical field
    const [enrollments, marks, publishedResult] = await Promise.all([
      Enrollment.find({ classId }).populate('studentId', 'name rollNo avatarUrl'),
      MarkRecord.find({ classId }),
      PublishedResult.findOne({ classId }),
    ]);
    const isPublished = !!publishedResult;

    const results = enrollments.map((enrollment) => {
      const student = enrollment.studentId as unknown as {
        _id: string;
        rollNo?: string;
        name: string;
      };
      const studentMarks = marks.filter((m) => m.studentId.toString() === student._id);

      const internal = studentMarks.find((m) => m.type === 'Internal')?.marksObtained || 0;
      const midSem = studentMarks.find((m) => m.type === 'Mid-Sem')?.marksObtained || 0;
      const endSem = studentMarks.find((m) => m.type === 'End-Sem')?.marksObtained || 0;
      const lab = studentMarks.find((m) => m.type === 'Lab')?.marksObtained || 0;
      const totalMarks = internal + midSem + endSem + lab;

      // CQ-009: Use class-configured maxMarks instead of hardcoded 190
      const maxConfig = classData.maxMarks ?? { internal: 20, midSem: 30, endSem: 50, lab: 100 };
      const totalMaxMarks =
        maxConfig.internal + maxConfig.midSem + maxConfig.endSem + maxConfig.lab;
      const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
      const grade = enrollment.finalGrade || '';

      return {
        studentId: student._id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        internalMarks: internal,
        midSemMarks: midSem,
        endSemMarks: endSem,
        labMarks: lab,
        totalMarks,
        percentage: Math.round(percentage * 100) / 100,
        maxMarks: classData.maxMarks || { internal: 20, midSem: 30, endSem: 50, lab: 100 },
        grade,
        isPublished: publishedResult?.isPublished || false,
        isMidSemPublished: publishedResult?.isMidSemPublished || false,
        isEndSemPublished: publishedResult?.isEndSemPublished || false,
      };
    });

    results.sort((a, b) =>
      String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })
    );

    res.status(200).json({
      success: true,
      isPublished: publishedResult?.isPublished || false,
      isMidSemPublished: publishedResult?.isMidSemPublished || false,
      isEndSemPublished: publishedResult?.isEndSemPublished || false,
      classInfo: {
        subjectName: classData.subjectName,
        subjectCode: classData.subjectCode,
        department: classData.department,
        semester: classData.semester,
        academicYear: classData.academicYear,
        instructorName: (classData.facultyId as { name?: string })?.name,
        instructorEmail: (classData.facultyId as { email?: string })?.email,
        instructorEmployeeId: (classData.facultyId as { employeeId?: string })?.employeeId,
        instructorDesignation: (classData.facultyId as { designation?: string })?.designation,
      },
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublishedResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await PublishedResult.find();
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const getEnrolledResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401);
      throw new Error('Not authorized');
    }

    let filter: any = {};
    let relevantClasses: any[] = [];

    if (user.role === 'Student') {
      const enrollments = await Enrollment.find({ studentId: user._id });
      const enrolledClassIds = enrollments.map((e) => e.classId);
      relevantClasses = await Class.find({ _id: { $in: enrolledClassIds } });
    } else if (user.role === 'Faculty') {
      relevantClasses = await Class.find({ facultyId: user._id });
    }

    const classIds = relevantClasses.map((c) => c._id);

    // Fetch all enrollments and marks for these classes
    const allEnrollments = await Enrollment.find({ classId: { $in: classIds } }).populate(
      'studentId',
      'name rollNo avatarUrl'
    );
    // CQ-012: removed legacy {class: classId} $or — classId is the canonical field
    const allMarks = await MarkRecord.find({ classId: { $in: classIds } });

    // Get published statuses
    const publishedResults = await PublishedResult.find({ classId: { $in: classIds } });

    // Create map for easy lookup
    const publishedMap = new Map<string, (typeof publishedResults)[number]>();
    publishedResults.forEach((p) => {
      publishedMap.set(String(p.classId), p);
    });

    const combinedResults = allEnrollments.map((enrollment) => {
      const student = enrollment.studentId as unknown as {
        _id: string;
        rollNo?: string;
        name: string;
      };
      const classIdStr = String(enrollment.classId);
      const studentMarks = allMarks.filter(
        (m) => m.studentId.toString() === student._id && String(m.classId) === classIdStr
      );

      const internal = studentMarks.find((m) => m.type === 'Internal')?.marksObtained || 0;
      const midSem = studentMarks.find((m) => m.type === 'Mid-Sem')?.marksObtained || 0;
      const endSem = studentMarks.find((m) => m.type === 'End-Sem')?.marksObtained || 0;
      const lab = studentMarks.find((m) => m.type === 'Lab')?.marksObtained || 0;
      const totalMarks = internal + midSem + endSem + lab;

      const pubStatus = publishedMap.get(classIdStr);
      const classData = relevantClasses.find((c) => String(c._id) === classIdStr);

      return {
        studentId: student._id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        classId: classIdStr,
        className: classData?.subjectName || 'Unknown Class',
        classCode: classData?.subjectCode || '',
        internalMarks: internal,
        midSemMarks: midSem,
        endSemMarks: endSem,
        labMarks: lab,
        totalMarks,
        maxMarks: classData?.maxMarks || { internal: 20, midSem: 30, endSem: 50, lab: 100 },
        grade: enrollment.finalGrade || '',
        isPublished: pubStatus?.isPublished || false,
        isMidSemPublished: pubStatus?.isMidSemPublished || false,
        isEndSemPublished: pubStatus?.isEndSemPublished || false,
      };
    });

    // If student, filter out classes where NO stage is published
    const finalResults =
      user.role === 'Student'
        ? combinedResults.filter((r) => r.isPublished || r.isMidSemPublished || r.isEndSemPublished)
        : combinedResults;

    finalResults.sort((a, b) =>
      String(a.rollNo).localeCompare(String(b.rollNo), undefined, { numeric: true })
    );

    res.status(200).json({ success: true, data: finalResults });
  } catch (error) {
    next(error);
  }
};

export const publishResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, stage } = req.body;
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

    let published = await PublishedResult.findOne({ classId });
    if (!published) {
      published = await PublishedResult.create({
        classId,
        semester: classData.semester,
        publishedBy: user?._id,
        isPublished: stage === 'full' || !stage,
        isMidSemPublished: stage === 'mid-sem',
        isEndSemPublished: stage === 'end-sem',
      });
    } else {
      if (stage === 'mid-sem') {
        published.isMidSemPublished = true;
      } else if (stage === 'end-sem') {
        published.isEndSemPublished = true;
      } else {
        published.isPublished = true;
      }
      published.publishedAt = new Date();
      await published.save();
    }

    res.status(200).json({ success: true, message: 'Result published', data: published });
  } catch (error) {
    next(error);
  }
};

export const unpublishResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: classId } = req.params;
    const { stage } = req.query;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to unpublish results for this class');
    }

    const published = await PublishedResult.findOne({ classId });
    if (published) {
      if (stage === 'mid-sem') {
        published.isMidSemPublished = false;
        await published.save();
      } else if (stage === 'end-sem') {
        published.isEndSemPublished = false;
        await published.save();
      } else if (stage === 'full') {
        published.isPublished = false;
        await published.save();
      } else {
        // Fallback for full/legacy unpublish
        await PublishedResult.deleteOne({ classId });
      }
    }

    res.status(200).json({ success: true, message: 'Result unpublished' });
  } catch (error) {
    next(error);
  }
};

export const updateGrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId, studentId, grade } = req.body;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (user?.role === 'Faculty' && classData.facultyId.toString() !== user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to edit grades for this class');
    }

    const enrollment = await Enrollment.findOne({ classId, studentId });
    if (!enrollment) {
      res.status(404);
      throw new Error('Enrollment not found');
    }

    enrollment.finalGrade = grade;
    await enrollment.save();

    res.status(200).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};
