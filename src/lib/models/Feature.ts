import mongoose, { Schema, type Model } from "mongoose";
import { FEATURE_DESCRIPTION_MAX_LENGTH } from "@/lib/feature-description";

export const FEATURE_TYPES = [
  "new_feature",
  "ui_modification",
  "backend_modification",
  "business_logic_change",
  "technical_support",
  "bug_fix",
] as const;
export type FeatureType = (typeof FEATURE_TYPES)[number];
export type FeatureStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type FeaturePricingMode = "free" | "pricing_pending" | "fixed" | "hourly";

export interface IFeature {
  _id: string;
  userId: mongoose.Types.ObjectId;
  freelanceProjectId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: FeatureType;
  status: FeatureStatus;
  pricingMode: FeaturePricingMode;
  hourlyRateEgp: number;
  minimumPriceEgp: number | null;
  estimatedMinutes: number | null;
  pricingCurrency: "EGP" | "SAR";
  pricingExchangeRateToEgp: number;
  approvedPriceEgp: number | null;
  approvedPriceOriginal: number | null;
  pricingApprovedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureSchema = new Schema<IFeature>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    freelanceProjectId: { type: Schema.Types.ObjectId, ref: "FreelanceProject", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: "", maxlength: FEATURE_DESCRIPTION_MAX_LENGTH },
    type: {
      type: String,
      enum: FEATURE_TYPES,
      default: "new_feature",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    pricingMode: {
      type: String,
      enum: ["free", "pricing_pending", "fixed", "hourly"],
      default: "pricing_pending",
    },
    hourlyRateEgp: { type: Number, min: 0, default: 500 },
    minimumPriceEgp: { type: Number, min: 0, default: 1000 },
    estimatedMinutes: { type: Number, min: 0, default: null },
    pricingCurrency: { type: String, enum: ["EGP", "SAR"], default: "EGP" },
    pricingExchangeRateToEgp: { type: Number, min: 0, default: 1 },
    approvedPriceEgp: { type: Number, min: 0, default: null },
    approvedPriceOriginal: { type: Number, min: 0, default: null },
    pricingApprovedAt: { type: Date, default: null },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FeatureSchema.index({ userId: 1, freelanceProjectId: 1, createdAt: -1 });
FeatureSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Feature: Model<IFeature> =
  mongoose.models.Feature || mongoose.model<IFeature>("Feature", FeatureSchema);
