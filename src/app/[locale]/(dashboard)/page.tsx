"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ReportChartsLazy } from "@/components/dashboard/report-charts-lazy";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { SmartInsightsWidget } from "@/components/dashboard/insights-widget";
import { jsonFetch } from "@/lib/fetcher";
import type { MonthlyReportDto } from "@/types/report";
import { queryKeys } from "@/features/_lib/query-keys";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { BarChart3 } from "lucide-react";
import { MonthCompareSection } from "@/components/dashboard/month-compare-section";

export default function DashboardPage() {
  const t = useTranslations("home");
  const tC = useTranslations("common");
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () => jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
  });
  const report = data?.data;

  return (
    <div className="min-w-0 max-w-6xl space-y-5 sm:space-y-7">
      <PageHeader
        title={t("title")}
        description={t("descriptionAllTime")}
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
        <QueryErrorAlert
          error={error}
          variant="callout"
          title={t("loadErrorTitle")}
          trailing={t("loadErrorBody")}
        />
      )}

      <SummaryCards report={!isLoading ? report : undefined} allTime />
      <MonthCompareSection />
      <AlertsWidget />
      <SmartInsightsWidget report={!isLoading ? report : undefined} />

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
