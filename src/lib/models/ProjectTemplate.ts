import mongoose, { Schema, type Model } from "mongoose";
import type { PaymentMethod } from "@/lib/payment-method";
import { PROJECT_TYPES, type ProjectType } from "@/lib/project-type";
import type { ProjectScopeItem } from "@/lib/project-scope";
import type { WorkPhase } from "@/lib/project-work-phase";

export interface IProjectTemplate {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  projectType: ProjectType;
  expectedPaymentMethod: PaymentMethod;
  workPhase: WorkPhase;
  notes: string;
  scopeItems: ProjectScopeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTemplateSchema = new Schema<IProjectTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    projectType: { type: String, enum: PROJECT_TYPES, default: "normal" },
    expectedPaymentMethod: {
      type: String,
      enum: ["cash", "card", "unspecified"],
      default: "cash",
    },
    workPhase: {
      type: String,
      enum: ["quote", "in_progress", "delivered"],
      default: "quote",
    },
    notes: { type: String, trim: true, default: "" },
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

ProjectTemplateSchema.index({ userId: 1, name: 1 });

export const ProjectTemplate: Model<IProjectTemplate> =
  mongoose.models.ProjectTemplate ||
  mongoose.model<IProjectTemplate>("ProjectTemplate", ProjectTemplateSchema);
