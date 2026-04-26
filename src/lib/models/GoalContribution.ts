import mongoose, { Schema, type Model } from "mongoose";

export type GoalContributionSource = "manual" | "auto";

export interface IGoalContribution {
  _id: string;
  userId: mongoose.Types.ObjectId;
  goalId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  source: GoalContributionSource;
  createdAt: Date;
  updatedAt: Date;
}

const GoalContributionSchema = new Schema<IGoalContribution>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: "Goal", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    source: { type: String, enum: ["manual", "auto"], default: "manual" },
  },
  { timestamps: true }
);

GoalContributionSchema.index({ userId: 1, goalId: 1, date: -1 });

export const GoalContribution: Model<IGoalContribution> =
  mongoose.models.GoalContribution ||
  mongoose.model<IGoalContribution>("GoalContribution", GoalContributionSchema);
