import mongoose, { Schema, type Model } from "mongoose";

export type FeatureTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface IFeatureTask {
  _id: string;
  userId: mongoose.Types.ObjectId;
  featureId: mongoose.Types.ObjectId;
  freelanceProjectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: FeatureTaskStatus;
  defaultBillable: boolean;
  estimatedMinutes: number | null;
  sortOrder: number;
  isArchived: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureTaskSchema = new Schema<IFeatureTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    featureId: { type: Schema.Types.ObjectId, ref: "Feature", required: true, index: true },
    freelanceProjectId: { type: Schema.Types.ObjectId, ref: "FreelanceProject", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    defaultBillable: { type: Boolean, default: true },
    estimatedMinutes: { type: Number, min: 0, default: null },
    sortOrder: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FeatureTaskSchema.index({ userId: 1, featureId: 1, sortOrder: 1 });

export const FeatureTask: Model<IFeatureTask> =
  mongoose.models.FeatureTask || mongoose.model<IFeatureTask>("FeatureTask", FeatureTaskSchema);
