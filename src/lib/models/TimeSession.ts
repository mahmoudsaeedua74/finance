import mongoose, { Schema, type Model } from "mongoose";

export type TimeSessionStatus = "running" | "paused" | "stopped";
export type TimeSessionSource = "timer" | "manual";

export interface ITimeSession {
  _id: string;
  userId: mongoose.Types.ObjectId;
  featureId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  status: TimeSessionStatus;
  startedAt: Date;
  activeStartedAt: Date | null;
  endedAt: Date | null;
  elapsedSeconds: number;
  billable: boolean;
  source: TimeSessionSource;
  manualEditReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSessionSchema = new Schema<ITimeSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    featureId: { type: Schema.Types.ObjectId, ref: "Feature", required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "FeatureTask", required: true, index: true },
    status: { type: String, enum: ["running", "paused", "stopped"], required: true, default: "running" },
    startedAt: { type: Date, required: true },
    activeStartedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    elapsedSeconds: { type: Number, min: 0, default: 0 },
    billable: { type: Boolean, default: true },
    source: { type: String, enum: ["timer", "manual"], default: "timer" },
    manualEditReason: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

TimeSessionSchema.index({ userId: 1, featureId: 1, taskId: 1, startedAt: -1 });
TimeSessionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "running" } }
);

export const TimeSession: Model<ITimeSession> =
  mongoose.models.TimeSession || mongoose.model<ITimeSession>("TimeSession", TimeSessionSchema);
