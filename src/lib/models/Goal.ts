import mongoose, { Schema, type Model } from "mongoose";

export type GoalStatus = "active" | "completed" | "paused";

export interface IGoal {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmount: number;
  deadline?: Date | null;
  manualContributionTotal: number;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    deadline: { type: Date, default: null },
    manualContributionTotal: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);
