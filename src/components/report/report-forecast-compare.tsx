"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { addCalendarMonths } from "@/lib/monthly";
import { formatMoney, monthLabel } from "@/lib/format";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ForecastPayload = {
  year: number;
  month: number;
  expectedIncome: number;
  expectedExpenses: number;
  expectedSavings: number;
  breakdown: {
    recurringIncomeTotal: number;
    avgIncomeLast3Months: number;
    recurringExpenseTotal: number;
    avgVariableSpendLast3Months: number;
  };
};

export function ReportForecastCompare() {
  const { year, month } = useMonth();
  const t = useTranslations("report");
  const locale = useLocale();
  const next = addCalendarMonths(year, month, 1);

  const { data: cur, isLoading: l0 } = useQuery({
    queryKey: ["forecast", year, month],
    queryFn: () =>
      jsonFetch<{ data: ForecastPayload }>(
        `/api/forecast?year=${year}&month=${month}`,
      ),
  });
  const { data: nxt, isLoading: l1 } = useQuery({
    queryKey: ["forecast", next.year, next.month],
    queryFn: () =>
      jsonFetch<{ data: ForecastPayload }>(
        `/api/forecast?year=${next.year}&month=${next.month}`,
      ),
  });

  const a = cur?.data;
  const b = nxt?.data;
  if (l0 || l1) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="animate-pulse">
          <CardContent className="h-32 p-4" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="h-32 p-4" />
        </Card>
      </div>
    );
  }
  if (!a || !b) return null;

  const col = (f: ForecastPayload, label: string) => (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <CardDescription>{t("forecastRecurringNote")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">{t("forecastIn")}</span>
          <span className="font-semibold tabular-nums">{formatMoney(f.expectedIncome)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">{t("forecastOut")}</span>
          <span className="font-semibold tabular-nums">{formatMoney(f.expectedExpenses)}</span>
        </div>
        <div
          className={cn(
            "flex justify-between gap-2 border-t border-border/60 pt-2 font-medium",
            f.expectedSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}
        >
          <span>{t("forecastNet")}</span>
          <span className="tabular-nums">{formatMoney(f.expectedSavings)}</span>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          {t("forecastBreakdown", {
            recExp: formatMoney(f.breakdown.recurringExpenseTotal),
            recInc: formatMoney(f.breakdown.recurringIncomeTotal),
          })}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground min-[400px]:text-base min-[400px]:text-foreground">
        {t("forecastSectionTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {col(a, t("forecastFor", { month: monthLabel(a.year, a.month, locale) }))}
        {col(b, t("forecastFor", { month: monthLabel(b.year, b.month, locale) }))}
      </div>
    </div>
  );
}
