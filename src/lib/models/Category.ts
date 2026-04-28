import mongoose, { Schema, type Model } from "mongoose";

export type CategoryType = "income" | "expense";

export interface ICategory {
  _id: string;
  name: string;
  normalizedName: string;
  type: CategoryType;
  userId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: ["income", "expense"], required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ userId: 1, type: 1, normalizedName: 1 }, { unique: true });

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
