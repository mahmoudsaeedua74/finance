import mongoose, { Schema, type Model } from "mongoose";
import type { PaymentMethod } from "@/lib/payment-method";

/** variable = daily/one-off; fixed = rent, salaries, etc. */
export type ExpenseKind = "variable" | "fixed";

export interface IExpense {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  /** For non-templates: the date of the expense. For templates, set to validFrom. */
  date: Date;
  category: string;
  kind: ExpenseKind;
  /** When true and isTemplate, amount repeats every month in [validFrom, validTo]. */
  recurring: boolean;
  /**
   * Recurring fixed rows (e.g. gym, employees) use one document;
   * monthly view includes the amount for each in-range month.
   */
  isTemplate: boolean;
  validFrom: Date;
  validTo: Date | null;
  /**
   * For recurring templates: calendar day of month (1–30) for due reminders.
   * In shorter months, the effective day is min(due, last day of month).
   */
  dueDayOfMonth: number;
  /** Spend attributed to a project (same text as `Project.name` for P&L). */
  projectName?: string;
  freelanceProjectId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true, default: "general" },
    kind: { type: String, enum: ["variable", "fixed"], required: true },
    recurring: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, default: null },
    dueDayOfMonth: { type: Number, min: 1, max: 30, default: 1 },
    projectName: { type: String, trim: true, default: "" },
    freelanceProjectId: {
      type: Schema.Types.ObjectId,
      ref: "FreelanceProject",
      default: null,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "unspecified"],
      default: "unspecified",
    },
  },
  { timestamps: true }
);
ExpenseSchema.index({ userId: 1, projectName: 1 });

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, isTemplate: 1, validFrom: 1 });
/** Template list: `find({ userId, isTemplate: true }).sort({ date: -1 })` */
ExpenseSchema.index({ userId: 1, isTemplate: 1, date: -1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);
