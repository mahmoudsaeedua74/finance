export type PaymentMethod = "cash" | "card" | "unspecified";

export function normalizePaymentMethod(raw: unknown): PaymentMethod {
  if (raw === "cash" || raw === "card") return raw;
  return "unspecified";
}

export function parsePaymentMethodBody(raw: unknown): PaymentMethod | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return normalizePaymentMethod(raw);
}

/** Treat legacy rows without the field as unspecified (excluded from wallet math). */
export function isWalletPaymentMethod(m: PaymentMethod | undefined | null): m is "cash" | "card" {
  return m === "cash" || m === "card";
}
