"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletSummary } from "@/types/wallet";

type WalletCompactBalancesProps = {
  summary: Pick<WalletSummary, "cashBalance" | "cardBalance" | "totalBalance">;
  className?: string;
};

export function WalletCompactBalances({ summary, className }: WalletCompactBalancesProps) {
  const t = useTranslations("wallet");

  const rows = [
    { key: "cash", label: t("cash"), value: summary.cashBalance },
    { key: "card", label: t("cardShort"), value: summary.cardBalance },
    { key: "total", label: t("total"), value: summary.totalBalance, emphasis: true },
  ] as const;

  return (
    <div
      className={cn(
        "space-y-1 rounded-xl border border-border/70 bg-muted/10 p-2",
        className
      )}
    >
      {rows.map((row) => (
        <div key={row.key} className="flex min-w-0 items-baseline justify-between gap-2">
          <p className="shrink-0 text-[0.6rem] font-semibold uppercase leading-none text-muted-foreground">
            {row.label}
          </p>
          <p
            className={cn(
              "min-w-0 truncate font-mono text-xs font-bold tabular-nums leading-none",
              "emphasis" in row && row.emphasis && "text-primary"
            )}
            dir="ltr"
            title={formatMoney(row.value)}
          >
            {formatMoney(row.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
