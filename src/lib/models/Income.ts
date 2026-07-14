import mongoose, { Schema, type Model } from "mongoose";
import type { PaymentMethod } from "@/lib/payment-method";

export type IncomeType = "salary" | "freelance" | "gam3eya" | "other";

export interface IIncome {
  _id: string;
  userId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  date: Date;
  incomeType: IncomeType;
  category?: string;
  paymentMethod: PaymentMethod;
  /** If set, this row was materialized from a {@link RecurringIncomeTemplate} (dedup key). */
  recurringSourceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    incomeType: {
      type: String,
      enum: ["salary", "freelance", "gam3eya", "other"],
      default: "other",
    },
    category: { type: String, trim: true, default: "" },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "unspecified"],
      default: "unspecified",
    },
    recurringSourceId: {
      type: Schema.Types.ObjectId,
      ref: "RecurringIncomeTemplate",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

IncomeSchema.index({ userId: 1, date: -1 });

export const Income: Model<IIncome> =
  mongoose.models.Income ||
  mongoose.model<IIncome>("Income", IncomeSchema);
