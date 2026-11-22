import type { ProjectCurrency } from "@/lib/currency";
import type { FeaturePricingMode, FeatureStatus, FeatureType, FeatureTaskStatus, TimeSessionStatus } from "@/lib/models";

export type FeaturePaymentStatus = "not_applicable" | "pricing_pending" | "unpaid" | "partial" | "paid";

export type TimeSessionDto = {
  id: string;
  taskId: string;
  status: TimeSessionStatus;
  startedAt: string;
  activeStartedAt: string | null;
  endedAt: string | null;
  elapsedSeconds: number;
  billable: boolean;
  source: "timer" | "manual";
};

export type FeatureTaskDto = {
  id: string;
  featureId: string;
  title: string;
  description: string;
  status: FeatureTaskStatus;
  defaultBillable: boolean;
  estimatedMinutes: number | null;
  sortOrder: number;
  trackedSeconds: number;
  billableSeconds: number;
  billableSecondsForPayment: number;
  activeSession: TimeSessionDto | null;
  lastSession: TimeSessionDto | null;
  billing?: {
    amountEgp: number;
    collectedAmountEgp: number;
    collectableAmountEgp: number;
    entryId: string;
  };
};

export type FeatureDto = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: FeatureType;
  status: FeatureStatus;
  pricingMode: FeaturePricingMode;
  hourlyRateEgp: number;
  minimumPriceEgp: number | null;
  estimatedMinutes: number | null;
  pricingCurrency: ProjectCurrency;
  pricingExchangeRateToEgp: number;
  approvedPriceEgp: number | null;
  approvedPriceOriginal: number | null;
  trackedSeconds: number;
  billableSeconds: number;
  calculatedCostEgp: number;
  collectedAmountEgp: number;
  outstandingAmountEgp: number;
  paymentStatus: FeaturePaymentStatus;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  tasks: FeatureTaskDto[];
};
