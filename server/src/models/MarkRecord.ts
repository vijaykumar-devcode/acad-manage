import mongoose, { Schema, Document } from 'mongoose';

export interface IMarkRecord extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  type: 'Internal' | 'Mid-Sem' | 'End-Sem' | 'Lab';
  marksObtained: number;
  maxMarks: number;
  status: 'Entered' | 'Pending';
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const MarkRecordSchema: Schema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['Internal', 'Mid-Sem', 'End-Sem', 'Lab'], required: true },
    marksObtained: { type: Number, required: true },
    maxMarks: { type: Number, required: true, default: 40 },
    status: { type: String, enum: ['Entered', 'Pending'], default: 'Entered' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound index to ensure one record per student per type per class
MarkRecordSchema.index({ classId: 1, studentId: 1, type: 1 }, { unique: true });

export const MarkRecord = mongoose.model<IMarkRecord>('MarkRecord', MarkRecordSchema);
