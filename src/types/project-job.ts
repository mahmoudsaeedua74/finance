import type { ProjectCurrency } from "@/lib/currency";
import type { FreelanceProjectStatus } from "@/lib/models/FreelanceProject";
import type { PaymentMethod } from "@/lib/payment-method";
import type { ProjectType } from "@/lib/project-type";
import type { ProjectScopeItem } from "@/lib/project-scope";
import type { WorkPhase } from "@/lib/project-work-phase";

export type ProjectJobDto = {
  id: string;
  name: string;
  clientName: string;
  /** Always EGP — use for totals, pending, progress. */
  agreedAmount: number;
  currency: ProjectCurrency;
  /** Amount in `currency` as agreed with the client. */
  originalAmount: number;
  /** Locked 1 currency → EGP at save time. */
  exchangeRateToEgp: number;
  billingStatus: "unbilled" | "billed";
  invoiceId: string | null;
  projectType: ProjectType;
  scopeItems: ProjectScopeItem[];
  status: FreelanceProjectStatus;
  workPhase: WorkPhase;
  cancellationReason: string;
  isArchived: boolean;
  archivedAt: string | null;
  profitMarginPct: number | null;
  notes: string;
  startDate: string;
  createdAt: string;
  expectedPaymentDate: string | null;
  expectedPaymentMethod: PaymentMethod;
  collectedAmount: number;
  pendingAmount: number;
  spentAmount: number;
  netCollected: number;
  payouts: {
    id: string;
    amount: number;
    date: string;
    isCollected: boolean;
    collectedAt: string | null;
    paymentMethod: PaymentMethod;
    note: string;
  }[];
  costs: {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: PaymentMethod;
  }[];
};
