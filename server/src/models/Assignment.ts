import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  description: string;
  instructions?: string;
  classId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  dueDate: Date;
  maxMarks: number;
  submissionType: 'Online' | 'Offline' | 'PDF';
  attachments: string[];
  iconName?: string;
  iconColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    instructions: { type: String, default: '' },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, default: 10 },
    submissionType: { type: String, enum: ['Online', 'Offline', 'PDF'], default: 'Online' },
    attachments: { type: [String], default: [] },
    iconName: { type: String, default: 'FileText' },
    iconColor: { type: String, default: '#2563eb' },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
