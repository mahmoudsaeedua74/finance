import mongoose, { Schema, type Model } from "mongoose";
import type { IncomeType } from "./Income";

export type RecurringIncomeFrequency = "monthly" | "weekly";

export interface IRecurringIncomeTemplate {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  frequency: RecurringIncomeFrequency;
  /** Slug for generated {@link Income} lines (default salary for payroll). */
  incomeType: IncomeType;
  /**
   * For monthly: calendar day 1–30 when money is credited (clamped in short months, like expense due day).
   * Ignored for weekly (generation follows start’s weekday).
   */
  payDayOfMonth: number;
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
  lastGeneratedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringIncomeTemplateSchema = new Schema<IRecurringIncomeTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: ["monthly", "weekly"], required: true, default: "monthly" },
    incomeType: {
      type: String,
      enum: ["salary", "freelance", "gam3eya", "other"],
      default: "salary",
    },
    payDayOfMonth: { type: Number, min: 1, max: 30, default: 5 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
    lastGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RecurringIncomeTemplateSchema.index({ userId: 1, active: 1, startDate: 1 });

export const RecurringIncomeTemplate: Model<IRecurringIncomeTemplate> =
  mongoose.models.RecurringIncomeTemplate ||
  mongoose.model<IRecurringIncomeTemplate>("RecurringIncomeTemplate", RecurringIncomeTemplateSchema);
