import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  subjectName: string;
  subjectCode: string;
  department: string;
  semester: string;
  section: string;
  academicYear: string;
  facultyId: mongoose.Types.ObjectId;
  joinCode: string;
  isActive: boolean;
  iconName?: string;
  iconColor?: string;
  maxMarks?: {
    internal: number;
    midSem: number;
    endSem: number;
    lab: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema: Schema = new Schema(
  {
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true, uppercase: true },
    department: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    academicYear: { type: String, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinCode: { type: String, required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true },
    iconName: { type: String, default: 'BookOpen' },
    iconColor: { type: String, default: '#2563eb' },
    maxMarks: {
      internal: { type: Number, default: 20 },
      midSem: { type: Number, default: 30 },
      endSem: { type: Number, default: 50 },
      lab: { type: Number, default: 100 },
    },
  },
  { timestamps: true }
);

export const Class = mongoose.model<IClass>('Class', ClassSchema);
