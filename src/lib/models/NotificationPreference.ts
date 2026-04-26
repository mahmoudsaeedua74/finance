import mongoose, { Schema, type Model } from "mongoose";

export interface INotificationPreference {
  _id: string;
  userId: mongoose.Types.ObjectId;
  nearBudgetThresholdPct: number;
  inactivityDays: number;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
  digestEmailEnabled: boolean;
  /** If true, in-app job notifications are also sent by email (when SMTP is configured). */
  mirrorInAppToEmail: boolean;
  noLoginReminderEmail: boolean;
  netDecreaseEmail: boolean;
  inactivityNudgeEmail: boolean;
  /** In-app notifications when income / expense / project rows change. Default true. */
  activityNotificationsEnabled: boolean;
  /** Daily check: remind on the chosen calendar day for each active recurring expense template. Default true. */
  recurringDueRemindersEnabled: boolean;
  /** When set (e.g. 2000), warn in-app if this month’s net is below this value. Null = off. */
  lowBalanceThreshold: number | null;
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
    mirrorInAppToEmail: { type: Boolean, default: true },
    noLoginReminderEmail: { type: Boolean, default: true },
    netDecreaseEmail: { type: Boolean, default: true },
    inactivityNudgeEmail: { type: Boolean, default: true },
    activityNotificationsEnabled: { type: Boolean, default: true },
    recurringDueRemindersEnabled: { type: Boolean, default: true },
    lowBalanceThreshold: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

export const NotificationPreference: Model<INotificationPreference> =
  mongoose.models.NotificationPreference ||
  mongoose.model<INotificationPreference>("NotificationPreference", NotificationPreferenceSchema);
