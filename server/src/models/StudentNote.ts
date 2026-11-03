import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentNote extends Document {
  title: string;
  driveUrl: string;
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentNoteSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    driveUrl: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

// Fast lookup: all notes by a student in one class
StudentNoteSchema.index({ classId: 1, studentId: 1 });

export const StudentNote = mongoose.model<IStudentNote>('StudentNote', StudentNoteSchema);
