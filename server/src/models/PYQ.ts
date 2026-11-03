import mongoose, { Schema, Document } from 'mongoose';

export interface IPYQ extends Document {
  department: string;
  semester: string;
  subjectName: string;
  subjectCode: string;
  academicYear: string;
  examType: 'Mid Semester' | 'End Semester' | 'Internal' | 'Other';
  facultyId: mongoose.Types.ObjectId;
  description?: string;
  gDriveUrl: string;
  fileType: 'PDF' | 'DOC' | 'ZIP' | 'Other';
  createdAt: Date;
  updatedAt: Date;
}

const PYQSchema: Schema = new Schema(
  {
    department: { type: String, required: true, index: true },
    semester: { type: String, required: true, index: true },
    subjectName: { type: String, required: true, index: true },
    subjectCode: { type: String, required: true },
    academicYear: { type: String, required: true, index: true },
    examType: {
      type: String,
      enum: ['Mid Semester', 'End Semester', 'Internal', 'Other'],
      required: true,
      index: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String },
    gDriveUrl: { type: String, required: true },
    fileType: { type: String, enum: ['PDF', 'DOC', 'ZIP', 'Other'], default: 'PDF' },
  },
  { timestamps: true }
);

export const PYQ = mongoose.model<IPYQ>('PYQ', PYQSchema);
