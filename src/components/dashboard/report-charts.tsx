"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyReportDto } from "@/types/report";
import { labelExpenseCategory } from "@/lib/expense-categories";
import { INCOME_BY_TYPE_CHART_KEYS } from "@/lib/income-types";
import { useMemo, memo } from "react";

const CHART_TO_I18N: Record<string, string> = {
  [INCOME_BY_TYPE_CHART_KEYS.salary]: "salaryPayroll",
  [INCOME_BY_TYPE_CHART_KEYS.freelance]: "freelance",
  [INCOME_BY_TYPE_CHART_KEYS.gam3eya]: "gam3eya",
  [INCOME_BY_TYPE_CHART_KEYS.other]: "other",
  [INCOME_BY_TYPE_CHART_KEYS.projectPayouts]: "projectPayouts",
};

// oklch CSS vars are not always valid in SVG; use a fixed palette in charts
const PIE = ["#22c55e", "#0ea5e9", "#a855f7", "#f97316", "#64748b", "#e11d48"];
const BAR = "#0ea5e9";

function ReportChartsInner({ report }: { report: MonthlyReportDto | undefined }) {
  const t = useTranslations("chart");
  const tCat = useTranslations("expense.categories");
  const expenseData = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.expenseByCategory).map(([key, value]) => ({
      name: labelExpenseCategory(key, tCat),
      value,
    }));
  }, [report, tCat]);

  const incomeData = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.incomeByType).map(([name, value]) => {
      const sub = CHART_TO_I18N[name];
      let label = name;
      if (sub === "salaryPayroll") label = t("incomeByTypeLabels.salaryPayroll");
      else if (sub === "freelance") label = t("incomeByTypeLabels.freelance");
      else if (sub === "gam3eya") label = t("incomeByTypeLabels.gam3eya");
      else if (sub === "other") label = t("incomeByTypeLabels.other");
      else if (sub === "projectPayouts") label = t("incomeByTypeLabels.projectPayouts");
      return { name: label, value };
    });
  }, [report, t]);

  if (!report) {
    return (
      <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <Card className="h-64 min-[400px]:h-80 border-border/60 bg-card/50 animate-pulse" />
        <Card className="h-64 min-[400px]:h-80 border-border/60 bg-card/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-card to-muted/5 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/10 pb-3">
          <CardTitle className="text-base font-semibold">{t("byCategory")}</CardTitle>
        </CardHeader>
        <CardContent className="h-56 w-full min-w-0 min-[400px]:h-72 sm:h-64 md:h-72 pt-4">
          {expenseData.length === 0 ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4">
              <p className="text-center text-sm text-muted-foreground">{t("noExp")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  nameKey="name"
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {expenseData.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) =>
                    typeof v === "number" ? v.toFixed(2) : String(v ?? "")
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-card to-muted/5 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/10 pb-3">
          <CardTitle className="text-base font-semibold">{t("incomeSrc")}</CardTitle>
        </CardHeader>
        <CardContent className="h-56 w-full min-w-0 min-[400px]:h-72 sm:h-64 md:h-72 pt-4">
          {incomeData.length === 0 ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4">
              <p className="text-center text-sm text-muted-foreground">{t("noInc")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) =>
                    typeof v === "number" ? v.toFixed(2) : String(v ?? "")
                  }
                />
                <Bar dataKey="value" fill={BAR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const ReportCharts = memo(ReportChartsInner);
