"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { jsonFetch } from "@/lib/fetcher";
import { useTodayYearMonth } from "@/hooks/use-today-year-month";
import { monthLabel, formatMoney } from "@/lib/format";
import type { MonthlyReportDto } from "@/types/report";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

function prevMonth(y: number, m: number) {
  if (m <= 1) return { y: y - 1, m: 12 };
  return { y, m: m - 1 };
}

function DeltaLine({
  label,
  cur,
  prev,
  invertGoodBad,
}: {
  label: string;
  cur: number;
  prev: number;
  /** Expenses: increase is "bad" (red). */
  invertGoodBad?: boolean;
}) {
  const d = cur - prev;
  const up = d > 0.005;
  const down = d < -0.005;
  const good = invertGoodBad ? down : up;
  const bad = invertGoodBad ? up : down;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {formatMoney(prev)} → {formatMoney(cur)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold tabular-nums",
            good && "text-emerald-600 dark:text-emerald-400",
            bad && "text-rose-600 dark:text-rose-400"
          )}
        >
          {good && <TrendingUp className="size-3.5" aria-hidden />}
          {bad && <TrendingDown className="size-3.5" aria-hidden />}
          {!good && !bad && <Minus className="size-3.5" aria-hidden />}
          {d >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(d))}
        </span>
      </div>
    </div>
  );
}

export function MonthCompareSection() {
  const t = useTranslations("monthCompare");
  const { year, month } = useTodayYearMonth();
  const locale = useLocale();
  const { y: py, m: pm } = prevMonth(year, month);

  const { data, isLoading } = useQuery({
    queryKey: ["report-compare", year, month, py, pm],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        jsonFetch<{ data: MonthlyReportDto }>(`/api/reports/monthly?year=${year}&month=${month}`),
        jsonFetch<{ data: MonthlyReportDto }>(`/api/reports/monthly?year=${py}&month=${pm}`),
      ]);
      return { cur: a.data, prev: b.data };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-14 animate-pulse rounded bg-muted" />
          <div className="h-14 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const c = data?.cur?.summary;
  const p = data?.prev?.summary;
  if (!c || !p) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {t("subtitle", {
            current: monthLabel(year, month, locale),
            previous: monthLabel(py, pm, locale),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <DeltaLine label={t("income")} cur={c.totalIncome} prev={p.totalIncome} />
        <DeltaLine
          label={t("expenses")}
          cur={c.totalExpenses}
          prev={p.totalExpenses}
          invertGoodBad
        />
        <DeltaLine label={t("net")} cur={c.netBalance} prev={p.netBalance} />
      </CardContent>
    </Card>
  );
}
