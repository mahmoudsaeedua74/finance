export const PROJECT_CURRENCIES = ["EGP", "SAR"] as const;

export type ProjectCurrency = (typeof PROJECT_CURRENCIES)[number];

export function normalizeProjectCurrency(raw: unknown): ProjectCurrency {
  if (typeof raw === "string" && PROJECT_CURRENCIES.includes(raw as ProjectCurrency)) {
    return raw as ProjectCurrency;
  }
  return "EGP";
}

export function parseProjectCurrencyBody(raw: unknown): ProjectCurrency | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return normalizeProjectCurrency(raw);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert an amount in `currency` to EGP using the given rate (1 unit → EGP). */
export function toEgpAmount(
  originalAmount: number,
  currency: ProjectCurrency,
  rateToEgp: number
): number {
  if (currency === "EGP") return roundMoney(originalAmount);
  return roundMoney(originalAmount * rateToEgp);
}
