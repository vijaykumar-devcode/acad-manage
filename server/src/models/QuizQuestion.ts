import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion extends Document {
  quizId: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

const QuizQuestionSchema: Schema = new Schema({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  questionText: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [arrayLimit, 'Options array must contain exactly 4 items'],
  },
  correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
  marks: { type: Number, default: 1 },
});

function arrayLimit(val: string[]) {
  return val.length === 4;
}

export const QuizQuestion = mongoose.model<IQuizQuestion>('QuizQuestion', QuizQuestionSchema);
