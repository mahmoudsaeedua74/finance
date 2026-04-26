import mongoose, { Schema, type Model } from "mongoose";

export interface IEmailDigestState {
  _id: string;
  userId: mongoose.Types.ObjectId;
  cadence: "daily" | "weekly";
  lastSentAt?: Date | null;
  coolDownUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmailDigestStateSchema = new Schema<IEmailDigestState>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cadence: { type: String, enum: ["daily", "weekly"], default: "weekly" },
    lastSentAt: { type: Date, default: null },
    coolDownUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export const EmailDigestState: Model<IEmailDigestState> =
  mongoose.models.EmailDigestState ||
  mongoose.model<IEmailDigestState>("EmailDigestState", EmailDigestStateSchema);
