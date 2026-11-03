import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
  assignmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  gDriveUrl?: string;
  gDriveFileId?: string;
  marksObtained?: number;
  feedback?: string;
  status: 'Pending' | 'Submitted' | 'Evaluated' | 'Late';
  submittedAt: Date;
  evaluatedAt?: Date;
}

const SubmissionSchema: Schema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gDriveUrl: { type: String },
    gDriveFileId: { type: String },
    marksObtained: { type: Number },
    feedback: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Submitted', 'Evaluated', 'Late'],
      default: 'Pending',
    },
    submittedAt: { type: Date, default: Date.now },
    evaluatedAt: { type: Date },
  },
  { timestamps: true }
);

// Prevent duplicate submissions per assignment
SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
