import mongoose, { Schema, Document } from 'mongoose';

export interface IContestProblemResult extends Document {
  contestResultId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  problemId: string;
  problemName: string;
  solved: boolean;
  attempts: number;
  penalty: number;
  solvedAt?: Date;
}

const ContestProblemResultSchema: Schema = new Schema(
  {
    contestResultId: {
      type: Schema.Types.ObjectId,
      ref: 'ContestResult',
      required: true,
      index: true,
    },
    // Denormalized for direct queries without joining through ContestResult
    challengeId: { type: Schema.Types.ObjectId, ref: 'CodingChallenge', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // External problem identifier (e.g. "A", "B", "C" for Codeforces)
    problemId: { type: String, required: true },
    problemName: { type: String, required: true, default: '' },
    // Whether the problem was accepted by the provider's official rules
    solved: { type: Boolean, required: true, default: false },
    attempts: { type: Number, required: true, default: 0 },
    // Penalty time in seconds — semantics are provider-defined
    penalty: { type: Number, required: true, default: 0 },
    solvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Idempotency key for per-problem sync — same upsert pattern as ContestResult
ContestProblemResultSchema.index({ challengeId: 1, studentId: 1, problemId: 1 }, { unique: true });

// Fetch all problem results for a given contest result
ContestProblemResultSchema.index({ contestResultId: 1 });

export const ContestProblemResult = mongoose.model<IContestProblemResult>(
  'ContestProblemResult',
  ContestProblemResultSchema
);
