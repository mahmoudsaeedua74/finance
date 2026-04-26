import mongoose, { Schema, type Model } from "mongoose";

export interface INotificationPreference {
  _id: string;
  userId: mongoose.Types.ObjectId;
  nearBudgetThresholdPct: number;
  inactivityDays: number;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
  digestEmailEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    nearBudgetThresholdPct: { type: Number, default: 80, min: 1, max: 100 },
    inactivityDays: { type: Number, default: 5, min: 1, max: 90 },
    digestCadence: { type: String, enum: ["daily", "weekly"], default: "weekly" },
    criticalEmailEnabled: { type: Boolean, default: true },
    digestEmailEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const NotificationPreference: Model<INotificationPreference> =
  mongoose.models.NotificationPreference ||
  mongoose.model<INotificationPreference>("NotificationPreference", NotificationPreferenceSchema);
