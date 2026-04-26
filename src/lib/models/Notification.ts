import mongoose, { Schema, type Model } from "mongoose";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface INotification {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  readAt?: Date | null;
  dedupKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    dedupKey: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dedupKey: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
