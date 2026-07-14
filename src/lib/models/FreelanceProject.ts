import mongoose, { Schema, type Model } from "mongoose";
import type { PaymentMethod } from "@/lib/payment-method";
import type { ProjectType } from "@/lib/project-type";
import { PROJECT_TYPES } from "@/lib/project-type";
import type { ProjectScopeItem } from "@/lib/project-scope";
import type { WorkPhase } from "@/lib/project-work-phase";

export type FreelanceProjectStatus = "pending" | "partial" | "collected" | "cancelled";

export interface IFreelanceProject {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  /** Agreed / quoted amount from the client. */
  agreedAmount: number;
  status: FreelanceProjectStatus;
  /** Delivery pipeline: quote → in progress → delivered (separate from payment status) */
  workPhase: WorkPhase;
  /** Reason when status is cancelled */
  cancellationReason?: string;
  /** Hidden from default list when project is done */
  isArchived: boolean;
  archivedAt: Date | null;
  /** How the client is expected to pay (cash / card). */
  expectedPaymentMethod: PaymentMethod;
  /** Job category: css, sdk, frontend, etc. */
  projectType: ProjectType;
  /** Client / customer name for statements & proposals */
  clientName?: string;
  /** Scope line items for non-normal projects (proposals) */
  scopeItems?: ProjectScopeItem[];
  notes?: string;
  startDate: Date;
  expectedPaymentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FreelanceProjectSchema = new Schema<IFreelanceProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    agreedAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "partial", "collected", "cancelled"],
      default: "pending",
    },
    workPhase: {
      type: String,
      enum: ["quote", "in_progress", "delivered"],
      default: "in_progress",
    },
    cancellationReason: { type: String, trim: true, default: "" },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    notes: { type: String, trim: true, default: "" },
    startDate: { type: Date, required: true },
    expectedPaymentDate: { type: Date, default: null },
    expectedPaymentMethod: {
      type: String,
      enum: ["cash", "card", "unspecified"],
      default: "unspecified",
    },
    projectType: {
      type: String,
      enum: PROJECT_TYPES,
      default: "normal",
    },
    clientName: { type: String, trim: true, default: "" },
    scopeItems: {
      type: [
        {
          title: { type: String, required: true, trim: true },
          description: { type: String, trim: true, default: "" },
          amount: { type: Number, min: 0 },
          complexity: { type: String, enum: ["low", "mid", "high"] },
          tech: { type: String, trim: true, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

FreelanceProjectSchema.index({ userId: 1, startDate: -1 });
FreelanceProjectSchema.index({ userId: 1, createdAt: -1 });
FreelanceProjectSchema.index({ userId: 1, clientName: 1 });

export const FreelanceProject: Model<IFreelanceProject> =
  mongoose.models.FreelanceProject ||
  mongoose.model<IFreelanceProject>("FreelanceProject", FreelanceProjectSchema);
