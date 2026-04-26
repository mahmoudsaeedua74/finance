import mongoose, { Schema, type Model } from "mongoose";

export interface IBudget {
  _id: string;
  userId: mongoose.Types.ObjectId;
  category: string;
  monthKey: string; // YYYY-MM
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true, trim: true },
    monthKey: { type: String, required: true, trim: true },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, monthKey: 1, category: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);
