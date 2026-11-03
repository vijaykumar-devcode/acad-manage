import mongoose, { Schema, Document } from 'mongoose';
import { SUPPORTED_PLATFORMS, CodingPlatformId } from '../providers/types';

export type PublicationStatus = 'Draft' | 'Published';
export type SyncStatus = 'NotRequired' | 'Pending' | 'Syncing' | 'Synced' | 'Failed';

export interface ICodingChallenge extends Document {
  title: string;
  platform: CodingPlatformId;
  externalContestId: string;
  externalUrl: string;
  description: string;
  startTime: Date;
  endTime: Date;
  publicationStatus: PublicationStatus;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttemptAt?: Date;
  lastSuccessfulSyncAt?: Date;
  lastSyncError?: string;
  createdBy: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  participantCount: number;
  isActive: boolean;
}

const CodingChallengeSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    platform: { type: String, enum: SUPPORTED_PLATFORMS, required: true },
    externalContestId: { type: String, required: true, trim: true },
    externalUrl: { type: String, required: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    publicationStatus: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
      required: true,
    },
    syncStatus: {
      type: String,
      enum: ['NotRequired', 'Pending', 'Syncing', 'Synced', 'Failed'],
      default: 'NotRequired',
      required: true,
    },
    syncAttempts: { type: Number, default: 0 },
    lastSyncAttemptAt: { type: Date, default: null },
    lastSuccessfulSyncAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
      sparse: true,
    },
    publishedAt: { type: Date, default: null },
    participantCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Prevent duplicate active challenges for the same external contest on the same platform
CodingChallengeSchema.index({ platform: 1, externalContestId: 1, isActive: 1 }, { unique: true });

// List published and active challenges sorted by end time
CodingChallengeSchema.index({ publicationStatus: 1, isActive: 1, endTime: 1 });

// Cron: find challenges eligible for auto-sync
CodingChallengeSchema.index({ syncStatus: 1, endTime: 1, syncAttempts: 1 });

export const CodingChallenge = mongoose.model<ICodingChallenge>(
  'CodingChallenge',
  CodingChallengeSchema
);
