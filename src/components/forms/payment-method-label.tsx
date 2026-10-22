"use client";

import { useTranslations } from "next-intl";
import type { PaymentMethod } from "@/lib/payment-method";
import { cn } from "@/lib/utils";

export function paymentMethodText(
  method: PaymentMethod | string | null | undefined,
  labels: { cash: string; card: string; unspecified: string }
) {
  if (method === "cash") return labels.cash;
  if (method === "card") return labels.card;
  return labels.unspecified;
}

export function PaymentMethodLabel({
  method,
  className,
}: {
  method?: PaymentMethod | string | null;
  className?: string;
}) {
  const t = useTranslations("wallet");
  const text = paymentMethodText(method, {
    cash: t("methodCash"),
    card: t("cardShort"),
    unspecified: "—",
  });
  return <span className={cn("text-xs text-muted-foreground", className)}>{text}</span>;
}
