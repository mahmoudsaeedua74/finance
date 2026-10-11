import mongoose, { Schema, type Model } from "mongoose";

/**
 * Opening offsets for cash/card. May be negative when the user sets a current
 * balance lower than the sum of tagged transactions (manual correction).
 */
export interface IUserWallet {
  _id: string;
  userId: mongoose.Types.ObjectId;
  openingCash: number;
  openingCard: number;
  updatedAt: Date;
  createdAt: Date;
}

const UserWalletSchema = new Schema<IUserWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    openingCash: { type: Number, default: 0 },
    openingCard: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Next.js HMR can keep an older schema (with min: 0) — drop so the update applies.
if (mongoose.models.UserWallet) {
  delete mongoose.models.UserWallet;
}

export const UserWallet: Model<IUserWallet> = mongoose.model<IUserWallet>(
  "UserWallet",
  UserWalletSchema
);
