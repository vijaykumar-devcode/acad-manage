import mongoose, { Schema, Document } from 'mongoose';
import { SUPPORTED_PLATFORMS, CodingPlatformId } from '../providers/types';

export interface IChallengeParticipant extends Document {
  challengeId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  platform: CodingPlatformId;
  handle: string;
  registeredAt: Date;
}

const ChallengeParticipantSchema: Schema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'CodingChallenge',
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: SUPPORTED_PLATFORMS, required: true },
    // Immutable snapshot of the student's normalized handle at participation time.
    // Never updated, even if the student later changes their linked account.
    handle: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One participation per student per challenge
ChallengeParticipantSchema.index({ challengeId: 1, studentId: 1 }, { unique: true });

// Student's participation history sorted by recency
ChallengeParticipantSchema.index({ studentId: 1, registeredAt: -1 });

// Sync resolves standings by handle within a challenge
ChallengeParticipantSchema.index({ challengeId: 1, handle: 1 });

export const ChallengeParticipant = mongoose.model<IChallengeParticipant>(
  'ChallengeParticipant',
  ChallengeParticipantSchema
);
