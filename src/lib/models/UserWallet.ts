import mongoose, { Schema, type Model } from "mongoose";

/** Manual opening balances; transaction totals are added on top via wallet-service. */
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
    openingCash: { type: Number, default: 0, min: 0 },
    openingCard: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const UserWallet: Model<IUserWallet> =
  mongoose.models.UserWallet || mongoose.model<IUserWallet>("UserWallet", UserWalletSchema);
