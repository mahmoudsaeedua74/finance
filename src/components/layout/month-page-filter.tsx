"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMonth } from "@/context/month-context";
import { useMonthNetBalanceDisplay } from "@/hooks/use-month-net-balance";
import { useReports } from "@/hooks/use-reports";
import { queryKeys } from "@/features/_lib/query-keys";
import { jsonFetch } from "@/lib/fetcher";
import type { MonthlyReportDto } from "@/types/report";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthCompact } from "@/components/layout/month-compact";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

/**
 * Month + year + quick jump, shown at the top of every dashboard page (all breakpoints).
 * Replaces the old mobile-header month strip so filters live with page content.
 */
export function MonthPageFilter({ className }: { className?: string }) {
  const t = useTranslations("layout");
  const { year, month, setYearMonth } = useMonth();
  const net = useMonthNetBalanceDisplay();
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const rangeParam = search.get("range");
  const range = rangeParam === "yearly" || rangeParam === "all" ? rangeParam : "monthly";
  const rangeQ = useReports(range);
  const ledgerQ = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () => jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
    enabled: range === "all",
  });
  const netRange =
    range === "monthly"
      ? net
      : formatMoney(
          range === "all"
            ? (ledgerQ.data?.data.summary.netBalance ?? 0)
            : (rangeQ.data?.data.summary.netBalance ?? 0)
        );

  const setRange = (next: "monthly" | "yearly" | "all") => {
    const p = new URLSearchParams(search.toString());
    p.set("range", next);
    router.replace(`${pathname}?${p.toString()}`);
  };

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-border/60 bg-gradient-to-b from-card via-card/95 to-muted/25 p-3 shadow-sm ring-1 ring-border/30 sm:p-4",
        className
      )}
      role="region"
      aria-label={t("monthOverview")}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 gap-y-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {range === "monthly" ? t("monthOverview") : t("reportRange")}
        </p>
        <div className="text-end">
          <p className="text-[0.6rem] font-medium uppercase tracking-wider text-muted-foreground/90">
            {range === "monthly" ? t("netThisMonth") : t("rangeNet")}
          </p>
          <p className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
            {netRange}
          </p>
        </div>
      </div>

      {range === "monthly" && (
        <div className="mb-3">
          <MonthCompact />
        </div>
      )}

      <div className="mb-3 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {t("reportRange")}
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={range === "monthly" ? "default" : "outline"}
            onClick={() => setRange("monthly")}
          >
            {t("rangeMonthly")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={range === "yearly" ? "default" : "outline"}
            onClick={() => setRange("yearly")}
          >
            {t("rangeYearly")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={range === "all" ? "default" : "outline"}
            onClick={() => setRange("all")}
          >
            {t("rangeAll")}
          </Button>
        </div>
      </div>

      {range === "monthly" && (
        <div className="space-y-1.5">
          <Label
            htmlFor={id}
            className="text-xs font-medium text-muted-foreground"
          >
            {t("goToMonth")}
          </Label>
          <Input
            id={id}
            type="month"
            className="h-11 w-full max-w-full font-medium tabular-nums"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const [y, m] = v.split("-").map(Number);
              if (y && m >= 1 && m <= 12) {
                setYearMonth(y, m);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
