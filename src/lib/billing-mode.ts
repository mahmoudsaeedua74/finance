export const BILLING_MODES = ["fixed", "retainer"] as const;

export type BillingMode = (typeof BILLING_MODES)[number];

export function normalizeBillingMode(raw: unknown): BillingMode {
  return raw === "retainer" ? "retainer" : "fixed";
}

export function isRetainerMode(raw: unknown): boolean {
  return normalizeBillingMode(raw) === "retainer";
}
