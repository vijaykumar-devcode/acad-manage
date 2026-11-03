import { Request, Response, NextFunction } from 'express';
import { Notice } from '../models/Notice';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';

// Get student enrolled class notices
export const getStudentNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (user?.role !== 'Student') {
      res.status(403);
      throw new Error('Not authorized to access student notices');
    }

    const enrollments = await Enrollment.find({ studentId: user._id });
    const classIds = enrollments.map((e) => e.classId);

    const notices = await Notice.find({ classId: { $in: classIds } })
      .populate('classId', 'subjectName subjectCode semester avatarUrl')
      .populate('createdBy', 'name avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    next(error);
  }
};

// Get notices for a specific class
export const getClassNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classId } = req.params;
    const user = req.user;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Access check
    if (user?.role === 'Student') {
      const isEnrolled = await Enrollment.findOne({ classId, studentId: user._id });
      if (!isEnrolled) {
        res.status(403);
        throw new Error('Not authorized to access this class notices');
      }
    } else if (user?.role === 'Faculty') {
      if (classData.facultyId.toString() !== user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this class notices');
      }
    }

    const notices = await Notice.find({ classId })
      .populate('classId', 'subjectName subjectCode semester avatarUrl')
      .populate('createdBy', 'name avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    next(error);
  }
};

// Create a notice
export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, classId } = req.body;
    const user = req.user;

    if (!user || user.role !== 'Faculty') {
      res.status(403);
      throw new Error('Not authorized to create notices');
    }

    // Verify faculty owns the class
    const classData = await Class.findOne({ _id: classId, facultyId: user._id });
    if (!classData) {
      res.status(403);
      throw new Error('Not authorized for this class');
    }

    const notice = await Notice.create({
      title,
      content,
      classId,
      createdBy: user._id,
    });

    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    next(error);
  }
};

// Update a notice
export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const user = req.user;

    const notice = await Notice.findById(id);
    if (!notice) {
      res.status(404);
      throw new Error('Notice not found');
    }

    if (notice.createdBy.toString() !== user?._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this notice');
    }

    notice.title = title || notice.title;
    notice.content = content || notice.content;
    await notice.save();

    res.status(200).json({ success: true, data: notice });
  } catch (error) {
    next(error);
  }
};

// Delete a notice
export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notice = await Notice.findById(id);
    if (!notice) {
      res.status(404);
      throw new Error('Notice not found');
    }

    if (notice.createdBy.toString() !== user?._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this notice');
    }

    await Notice.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
