import type { PaymentMethod } from "@/lib/payment-method";

export type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom?: string;
  validTo?: string | null;
  /** Recurring template: calendar day 1–30 for due reminders. */
  dueDayOfMonth?: number;
  rowKind: "variable" | "fixed_once" | "recurring";
  displayDate?: string;
  projectName?: string;
};

/** POST body for variable/one-time fixed rows — `kind` is set in the mutation hook. */
export type CreateVariableExpenseInput = {
  title: string;
  amount: number;
  category: string;
  date: string;
  projectName?: string;
  paymentMethod?: PaymentMethod;
};

export type CreateRecurringTemplateInput = {
  title: string;
  amount: number;
  category: string;
  isTemplate: true;
  recurring: true;
  validFrom: string;
  validTo: string | null;
  /** 1–30; omit to derive from `validFrom` on the server. */
  dueDayOfMonth?: number;
  projectName?: string;
  paymentMethod?: PaymentMethod;
};

export type UpdateExpenseInput =
  | {
      title: string;
      amount: number;
      category: string;
      /** Same instant as `validFrom` for templates (list/sort + API model). */
      date: string;
      validFrom: string;
      validTo: string | null;
      dueDayOfMonth: number;
      recurring: true;
      isTemplate: true;
      kind: "fixed";
      projectName?: string;
    }
  | {
      title: string;
      amount: number;
      category: string;
      date: string;
      kind: "variable" | "fixed";
      projectName?: string;
    };
