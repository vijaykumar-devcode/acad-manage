import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  joinedAt: Date;
  finalGrade?: string;
}

const EnrollmentSchema: Schema = new Schema({
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  joinedAt: { type: Date, default: Date.now },
  finalGrade: { type: String },
});

// Enforce unique compound index to prevent duplicate enrollments
EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
