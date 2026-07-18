import mongoose, { Schema, type Model } from "mongoose";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export interface IInvoice {
  _id: string;
  userId: mongoose.Types.ObjectId;
  clientName: string;
  /** Flexible basket — editable until paid. */
  jobIds: mongoose.Types.ObjectId[];
  status: InvoiceStatus;
  /** Sum of job agreedAmount (always EGP book value). */
  totalEgp: number;
  notes: string;
  issuedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clientName: { type: String, required: true, trim: true, index: true },
    jobIds: [{ type: Schema.Types.ObjectId, ref: "FreelanceProject" }],
    status: {
      type: String,
      enum: ["draft", "issued", "paid", "cancelled"],
      default: "draft",
      index: true,
    },
    totalEgp: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "" },
    issuedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, clientName: 1, status: 1 });
InvoiceSchema.index({ userId: 1, createdAt: -1 });

export const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
