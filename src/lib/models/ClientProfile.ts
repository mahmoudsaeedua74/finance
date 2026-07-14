import mongoose, { Schema, type Model } from "mongoose";

export interface IClientProfile {
  _id: string;
  userId: mongoose.Types.ObjectId;
  clientName: string;
  phone: string;
  whatsapp: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientProfileSchema = new Schema<IClientProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    whatsapp: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

ClientProfileSchema.index({ userId: 1, clientName: 1 }, { unique: true });

export const ClientProfile: Model<IClientProfile> =
  mongoose.models.ClientProfile ||
  mongoose.model<IClientProfile>("ClientProfile", ClientProfileSchema);
