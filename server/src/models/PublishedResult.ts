import mongoose, { Schema, Document } from 'mongoose';

export interface IPublishedResult extends Document {
  classId: mongoose.Types.ObjectId;
  semester: string;
  publishedAt: Date;
  publishedBy: mongoose.Types.ObjectId;
  isPublished: boolean;
  isMidSemPublished: boolean;
  isEndSemPublished: boolean;
}

const PublishedResultSchema: Schema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      unique: true,
      index: true,
    },
    semester: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: true },
    isMidSemPublished: { type: Boolean, default: false },
    isEndSemPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PublishedResult = mongoose.model<IPublishedResult>(
  'PublishedResult',
  PublishedResultSchema
);
