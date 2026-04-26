"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { MonthlyReportDto, SmartInsightDto } from "@/types/report";

function InsightLine({ row, t }: { row: SmartInsightDto; t: (k: string, v?: Record<string, string | number>) => string }) {
  const money = (n: number) => formatMoney(n);
  switch (row.kind) {
    case "noSalary":
      return <p className="text-sm text-muted-foreground">{t("noSalary")}</p>;
    case "leftFromSalary":
      return (
        <p className="text-sm text-muted-foreground">
          {t("leftFromSalary", { left: money(row.left), expenses: money(row.expenses) })}
        </p>
      );
    case "overVsSalary":
      return (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {t("overVsSalary", { over: money(row.over), expenses: money(row.expenses), salary: money(row.salary) })}
        </p>
      );
    case "spendShareOfSalary":
      return <p className="text-sm text-muted-foreground">{t("spendShareOfSalary", { pct: row.pct })}</p>;
    case "expensesUp":
      return <p className="text-sm text-amber-700 dark:text-amber-300">{t("expensesUp", { pct: row.pct })}</p>;
    case "expensesDown":
      return <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("expensesDown", { pct: row.pct })}</p>;
    case "salaryVsPrev":
      if (row.pct > 0) {
        return <p className="text-sm text-muted-foreground">{t("salaryUpVsPrev", { pct: row.pct })}</p>;
      }
      return <p className="text-sm text-muted-foreground">{t("salaryDownVsPrev", { pct: -row.pct })}</p>;
    default:
      return null;
  }
}

export function SmartInsightsWidget({ report }: { report: MonthlyReportDto | undefined }) {
  const t = useTranslations("insight.smart");
  const rows = report?.smartInsights ?? [];
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r, i) => (
          <InsightLine key={`${(r as SmartInsightDto).kind}-${i}`} row={r as SmartInsightDto} t={t} />
        ))}
      </CardContent>
    </Card>
  );
}
