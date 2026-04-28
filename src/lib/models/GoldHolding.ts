import mongoose, { Schema, type Model } from "mongoose";

export type GoldKarat = 18 | 21 | 24;

export interface IGoldHolding {
  _id: string;
  userId: mongoose.Types.ObjectId;
  weightPerBar: number;
  numberOfBars: number;
  karat: GoldKarat;
  createdAt: Date;
  updatedAt: Date;
}

const GoldHoldingSchema = new Schema<IGoldHolding>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weightPerBar: { type: Number, required: true, min: 0.1 },
    numberOfBars: { type: Number, required: true, min: 1 },
    karat: { type: Number, enum: [18, 21, 24], required: true },
  },
  { timestamps: true }
);

GoldHoldingSchema.index({ userId: 1, createdAt: -1 });

export const GoldHolding: Model<IGoldHolding> =
  mongoose.models.GoldHolding ||
  mongoose.model<IGoldHolding>("GoldHolding", GoldHoldingSchema);
