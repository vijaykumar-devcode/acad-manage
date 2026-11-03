import mongoose, { Schema, Document } from 'mongoose';
import { SUPPORTED_PLATFORMS, CodingPlatformId } from '../providers/types';

export { SUPPORTED_PLATFORMS, CodingPlatformId };

export interface IStudentCodingAccount extends Document {
  studentId: mongoose.Types.ObjectId;
  platform: CodingPlatformId;
  handle: string;
  handleRaw: string;
  isVerified: boolean;
  verificationTokenHash?: string;
  verificationTokenExpiresAt?: Date;
  verifiedAt?: Date;
  lastSyncedAt?: Date;
}

const StudentCodingAccountSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: SUPPORTED_PLATFORMS, required: true },
    handle: { type: String, required: true, trim: true },
    handleRaw: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    verificationTokenHash: { type: String, default: null, select: false },
    verificationTokenExpiresAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One account per platform per student
StudentCodingAccountSchema.index({ studentId: 1, platform: 1 }, { unique: true });

// Prevent two students from claiming the same normalized handle on the same platform
StudentCodingAccountSchema.index({ platform: 1, handle: 1 }, { unique: true });

export const StudentCodingAccount = mongoose.model<IStudentCodingAccount>(
  'StudentCodingAccount',
  StudentCodingAccountSchema
);
