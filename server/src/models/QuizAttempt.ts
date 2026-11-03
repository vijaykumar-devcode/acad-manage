import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  score: number;
  totalPossibleMarks: number;
  answers: Map<string, number>;
  status: 'In-Progress' | 'Completed' | 'Evaluated';
  startedAt: Date;
  completedAt?: Date;
}

const QuizAttemptSchema: Schema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, default: 0 },
  totalPossibleMarks: { type: Number, default: 0 },
  answers: { type: Map, of: Number, default: {} },
  status: { type: String, enum: ['In-Progress', 'Completed', 'Evaluated'], default: 'In-Progress' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

// Enforce single attempt per student per quiz
QuizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export const QuizAttempt = mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
