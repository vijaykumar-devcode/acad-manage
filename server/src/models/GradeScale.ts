import mongoose, { Document, Schema } from 'mongoose';

export interface IGradeRule {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
}

export interface IGradeScale extends Document {
  rules: IGradeRule[];
}

const GradeRuleSchema = new Schema(
  {
    grade: { type: String, required: true },
    minPercentage: { type: Number, required: true },
    maxPercentage: { type: Number, required: true },
  },
  { _id: false }
);

const GradeScaleSchema = new Schema(
  {
    rules: [GradeRuleSchema],
  },
  { timestamps: true }
);

export const GradeScale = mongoose.model<IGradeScale>('GradeScale', GradeScaleSchema);
