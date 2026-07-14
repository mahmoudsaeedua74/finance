import mongoose, { Schema, type Model } from "mongoose";
import type { PaymentMethod } from "@/lib/payment-method";

export interface IProject {
  _id: string;
  userId: mongoose.Types.ObjectId;
  /** Link to freelance job container (optional for legacy rows). */
  freelanceProjectId?: mongoose.Types.ObjectId | null;
  name: string;
  amount: number;
  date: Date;
  /** When false, payout is planned but not yet received (excluded from income reports). */
  isCollected: boolean;
  collectedAt: Date | null;
  paymentMethod: PaymentMethod;
  /** Optional note (reason / details) for this payout line. */
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    freelanceProjectId: {
      type: Schema.Types.ObjectId,
      ref: "FreelanceProject",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    isCollected: { type: Boolean, default: true },
    collectedAt: { type: Date, default: null },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "unspecified"],
      default: "unspecified",
    },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, date: -1 });
ProjectSchema.index({ userId: 1, isCollected: 1, date: -1 });

export const Project: Model<IProject> =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
