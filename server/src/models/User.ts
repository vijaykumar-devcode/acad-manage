import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Faculty' | 'Student';
  department?: string;
  rollNo?: string;
  semester?: string;
  section?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  employeeId?: string;
  designation?: string;
  officeLocation?: string;
  isApproved: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // Exclude by default in queries
    role: { type: String, enum: ['Admin', 'Faculty', 'Student'], required: true },
    department: { type: String, required: true },
    rollNo: { type: String },
    semester: { type: String },
    section: { type: String },
    avatarUrl: { type: String },
    phoneNumber: { type: String },
    employeeId: { type: String },
    designation: { type: String },
    officeLocation: { type: String },
    isApproved: {
      type: Boolean,
      default: true, // overridden to false for Faculty at creation time
      index: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
