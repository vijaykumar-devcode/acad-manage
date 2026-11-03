import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { StudentNote } from '../models/StudentNote';
import { Enrollment } from '../models/Enrollment';

// ─── Validation ───────────────────────────────────────────────────────────────

const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters').trim(),
  driveUrl: z.string().url('Please enter a valid URL').trim(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verifies that the requesting student is enrolled in the given class. */
const assertEnrolled = async (classId: string, studentId: string): Promise<void> => {
  const enrollment = await Enrollment.findOne({ classId, studentId });
  if (!enrollment) {
    const err = new Error('You are not enrolled in this class');
    (err as any).statusCode = 403;
    throw err;
  }
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /notes/class/:classId
 * Returns all notes belonging to the requesting student in the given class.
 */
export const getMyNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId as string;
    const studentId = req.user!._id.toString();

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400);
      throw new Error('Invalid class ID');
    }

    await assertEnrolled(classId, studentId);

    const notes = await StudentNote.find({ classId, studentId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: notes });
  } catch (error: any) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

/**
 * POST /notes/class/:classId
 * Creates a new note for the requesting student in the given class.
 */
export const createNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId as string;
    const studentId = req.user!._id.toString();

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400);
      throw new Error('Invalid class ID');
    }

    await assertEnrolled(classId, studentId);

    const { title, driveUrl } = createNoteSchema.parse(req.body);

    const note = await StudentNote.create({ title, driveUrl, classId, studentId });

    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

/**
 * DELETE /notes/:id
 * Deletes a note — only the owning student may delete their own note.
 */
export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const studentId = req.user!._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid note ID');
    }

    const note = await StudentNote.findById(id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    // IDOR guard — only the note owner can delete it
    if (note.studentId.toString() !== studentId) {
      res.status(403);
      throw new Error('Not authorized to delete this note');
    }

    await note.deleteOne();

    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (error: any) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};
