import mongoose, { Schema, Document } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  subject: string;
  classId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  instructions?: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  totalMarks: number;
  status: 'Draft' | 'Scheduled' | 'Active' | 'Closed';
  iconName?: string;
  iconColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    subject: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    durationMinutes: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    instructions: { type: String },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true },
    totalMarks: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Closed'],
      default: 'Scheduled',
    },
    iconName: { type: String, default: 'FileText' },
    iconColor: { type: String, default: '#2563eb' },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
