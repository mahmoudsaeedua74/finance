import {
  normalizeProjectCurrency,
  parseProjectCurrencyBody,
  roundMoney,
  toEgpAmount,
  type ProjectCurrency,
} from "@/lib/currency";
import { getSarToEgpRateCached } from "@/lib/services/fx-rate-service";

export type ResolvedProjectMoney = {
  currency: ProjectCurrency;
  originalAmount: number;
  exchangeRateToEgp: number;
  agreedAmount: number;
};

/**
 * Resolve bookkeeping money from form input.
 * `amount` is always the amount in `currency` (what the user typed).
 */
export async function resolveProjectMoney(
  amount: number,
  currencyRaw: unknown
): Promise<ResolvedProjectMoney> {
  const currency = parseProjectCurrencyBody(currencyRaw) ?? normalizeProjectCurrency(currencyRaw);
  const originalAmount = roundMoney(Math.max(0, amount));

  // No FX needed when amount is still TBD (open retainer / end-of-month billing).
  if (originalAmount <= 0) {
    return {
      currency,
      originalAmount: 0,
      exchangeRateToEgp: currency === "EGP" ? 1 : 1,
      agreedAmount: 0,
    };
  }

  if (currency === "EGP") {
    return {
      currency: "EGP",
      originalAmount,
      exchangeRateToEgp: 1,
      agreedAmount: originalAmount,
    };
  }

  const fx = await getSarToEgpRateCached();
  return {
    currency: "SAR",
    originalAmount,
    exchangeRateToEgp: fx.rate,
    agreedAmount: toEgpAmount(originalAmount, "SAR", fx.rate),
  };
}
