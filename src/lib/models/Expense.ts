import mongoose, { Schema, type Model } from "mongoose";

/** variable = daily/one-off; fixed = rent, salaries, etc. */
export type ExpenseKind = "variable" | "fixed";

export interface IExpense {
  _id: string;
  title: string;
  amount: number;
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
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true, default: "general" },
    kind: { type: String, enum: ["variable", "fixed"], required: true },
    recurring: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, default: null },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ isTemplate: 1, validFrom: 1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);
