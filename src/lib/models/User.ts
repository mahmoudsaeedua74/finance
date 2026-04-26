import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  _id: string;
  email: string;
  passwordHash: string;
  name?: string;
  /** Updated on every successful sign-in (for inactivity & email nudges). */
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true, default: "" },
    lastLoginAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
