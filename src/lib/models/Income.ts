import mongoose, { Schema, type Model } from "mongoose";

export type IncomeType = "salary" | "freelance" | "other";

export interface IIncome {
  _id: string;
  title: string;
  amount: number;
  date: Date;
  incomeType: IncomeType;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    incomeType: {
      type: String,
      enum: ["salary", "freelance", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

IncomeSchema.index({ date: -1 });

export const Income: Model<IIncome> =
  mongoose.models.Income ||
  mongoose.model<IIncome>("Income", IncomeSchema);
