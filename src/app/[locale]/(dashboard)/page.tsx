"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ReportChartsLazy } from "@/components/dashboard/report-charts-lazy";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { monthLabel } from "@/lib/format";
import type { MonthlyReportDto } from "@/types/report";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const { year, month } = useMonth();
  const locale = useLocale();
  const t = useTranslations("home");
  const tC = useTranslations("common");
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", year, month],
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`
      ),
  });
  const report = data?.data;

  return (
    <div className="min-w-0 max-w-6xl space-y-5 sm:space-y-7">
      <PageHeader
        title={t("title")}
        description={t("description", {
          month: monthLabel(year, month, locale),
        })}
        icon={<BarChart3 className="size-5" />}
        action={
          <div className="hidden min-w-0 flex-wrap gap-2 min-[500px]:flex">
            <Link
              href="/income/new"
              className={cn(
                buttonVariants({ size: "default", variant: "secondary" }),
                "min-h-11 min-w-[6rem] touch-manipulation justify-center shadow-sm"
              )}
            >
              {tC("addIncome")}
            </Link>
            <Link
              href="/expense/new"
              className={cn(
                buttonVariants({ size: "default", variant: "secondary" }),
                "min-h-11 min-w-[6rem] touch-manipulation justify-center shadow-sm"
              )}
            >
              {tC("addExpense")}
            </Link>
          </div>
        }
      />

      {error && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">{t("loadErrorTitle")}</p>
          <p className="mt-0.5 text-destructive/90">
            {(error as Error).message} {t("loadErrorBody")}
          </p>
        </div>
      )}

      <SummaryCards report={!isLoading ? report : undefined} />

      <InsightsPanel report={!isLoading ? report : undefined} />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground min-[400px]:text-base min-[400px]:normal-case min-[400px]:tracking-tight min-[400px]:text-foreground">
          {t("breakdown")}
        </h2>
        <ReportChartsLazy report={!isLoading ? report : undefined} />
      </div>
    </div>
  );
}
