import mongoose, { Schema, Document } from 'mongoose';

export interface IStudyMaterial extends Document {
  title: string;
  classId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  gDriveFileId?: string;
  gDriveUrl: string;
  fileType: 'PDF' | 'DOC' | 'PPT' | 'ZIP' | 'Code';
  fileSize: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StudyMaterialSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gDriveFileId: { type: String },
    gDriveUrl: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['PDF', 'DOC', 'PPT', 'ZIP', 'Code'],
      required: true,
    },
    fileSize: { type: String, required: true },
    description: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound index for fast class feeds sorted by latest
StudyMaterialSchema.index({ classId: 1, createdAt: -1 });

export const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', StudyMaterialSchema);
