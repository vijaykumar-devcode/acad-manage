import mongoose, { Schema, Document } from 'mongoose';
import {
  SUPPORTED_PLATFORMS,
  CodingPlatformId,
  PARTICIPATION_STATUSES,
  ParticipationStatus,
} from '../providers/types';

export interface IContestResult extends Document {
  challengeId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  platform: CodingPlatformId;
  handle: string;
  providerRank: number;
  solvedCount: number;
  totalProblems: number;
  penalty: number;
  // Provider-native rating fields — semantics are platform-specific.
  // CampusAssess stores these as-is and never compares across platforms.
  ratingBefore?: number;
  ratingAfter?: number;
  ratingChange?: number;
  participationStatus: ParticipationStatus;
  syncedAt: Date;
}

const ContestResultSchema: Schema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'CodingChallenge',
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: SUPPORTED_PLATFORMS, required: true },
    handle: { type: String, required: true },
    providerRank: { type: Number, required: true, default: 0 },
    solvedCount: { type: Number, required: true, default: 0 },
    totalProblems: { type: Number, required: true, default: 0 },
    penalty: { type: Number, required: true, default: 0 },
    ratingBefore: { type: Number, default: null },
    ratingAfter: { type: Number, default: null },
    ratingChange: { type: Number, default: null },
    participationStatus: {
      type: String,
      enum: PARTICIPATION_STATUSES,
      default: 'Contestant',
      required: true,
    },
    syncedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Idempotency key — sync uses findOneAndUpdate with upsert:true on this compound key.
// Re-running sync updates existing results, never creates duplicates.
ContestResultSchema.index({ challengeId: 1, studentId: 1 }, { unique: true });

// Leaderboard default sort: most problems solved (desc), then least penalty (asc)
ContestResultSchema.index({ challengeId: 1, solvedCount: -1, penalty: 1 });

// Student's contest history sorted by recency
ContestResultSchema.index({ studentId: 1, syncedAt: -1 });

export const ContestResult = mongoose.model<IContestResult>('ContestResult', ContestResultSchema);
