"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { monthLabel, formatMoney, formatDateDayMonth } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LedgerTable } from "@/components/shared/ledger-table";
import type { MonthlyReportDto } from "@/types/report";
import { exportMonthlyReportPdf } from "@/lib/export-pdf";
import { exportMonthlyReportExcel } from "@/lib/export-excel";
import { toast } from "sonner";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ReportChartsLazy } from "@/components/dashboard/report-charts-lazy";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { AiInsightPanel } from "@/components/ai/ai-insight-panel";
import {
  applyReportFilters,
  getDefaultReportFilters,
  isReportFilterDefault,
  type ReportFilterState,
} from "@/lib/report-filters";
import { labelExpenseCategory } from "@/lib/expense-categories";
import { PaymentMethodLabel } from "@/components/forms/payment-method-label";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { ReportFiltersPanel } from "@/components/report/report-filters-panel";
import { ReportForecastCompare } from "@/components/report/report-forecast-compare";
import { ReportRangeToolbar } from "@/components/report/report-range-toolbar";
import type { ReportFilterType } from "@/hooks/use-reports";
import { queryKeys } from "@/features/_lib/query-keys";

function byDateDesc<T extends { date: string | Date }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export default function ReportPage() {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const tW = useTranslations("wallet");
  const locale = useLocale();
  const { year, month } = useMonth();
  const search = useSearchParams();
  const range: ReportFilterType =
    search.get("range") === "yearly" || search.get("range") === "all"
      ? (search.get("range") as ReportFilterType)
      : "monthly";
  const [filter, setFilter] = useState<ReportFilterState>(getDefaultReportFilters);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", range, year, month],
    enabled: range === "monthly",
    staleTime: 60_000,
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`
      ),
  });
  const raw = data?.data;
  const ledgerQ = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () => jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
    enabled: range === "all",
    staleTime: 60_000,
  });
  const yearlyQ = useQuery({
    queryKey: ["report-yearly", year],
    enabled: range === "yearly",
    staleTime: 60_000,
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(`/api/reports/yearly?year=${year}`).then(
        (r) => r.data
      ),
  });
  const activeRaw =
    range === "monthly"
      ? raw
      : range === "yearly"
        ? yearlyQ.data
        : ledgerQ.data?.data;

  const report = useMemo(() => {
    if (!activeRaw) return undefined;
    if (isReportFilterDefault(filter)) return activeRaw;
    return applyReportFilters(activeRaw, filter);
  }, [activeRaw, filter]);

  const isActiveRangeLoading =
    range === "monthly"
      ? isLoading
      : range === "yearly"
        ? yearlyQ.isLoading
        : ledgerQ.isLoading;

  const filenameBase = `report-${year}-${String(month).padStart(2, "0")}`;
  const suffix = isReportFilterDefault(filter) ? "" : "-filtered";
  const pdfName = `${filenameBase}${suffix}.pdf`;
  const xlsxName = `${filenameBase}${suffix}.xlsx`;

  const emailMut = useMutation({
    mutationFn: () =>
      jsonFetch("/api/email/monthly-report", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      }),
    onSuccess: () => toast.success(t("emailOk")),
    onError: (e: Error) => toast.error(e.message),
  });

  const periodSubtitle =
    range === "monthly"
      ? t("subtitle", { month: monthLabel(year, month, locale) })
      : range === "yearly"
        ? t("subtitleYearly")
        : t("subtitleAll");

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && range === "monthly" && <QueryErrorAlert error={error} />}
      {yearlyQ.error && range === "yearly" && <QueryErrorAlert error={yearlyQ.error} />}
      {ledgerQ.error && range === "all" && <QueryErrorAlert error={ledgerQ.error} />}

      {/* Stitch-style hero + range segmented control + export */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">{t("heroDesc")}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{periodSubtitle}</p>
          {range === "all" && (
            <p className="mt-1 text-xs text-muted-foreground">{t("allTimeSinceStart")}</p>
          )}
        </div>
      </div>

      <ReportRangeToolbar
        range={range}
        onExportPdf={() => {
          if (report) {
            exportMonthlyReportPdf(report, pdfName);
            toast.success(t("pdfOk"));
          }
        }}
        onExportExcel={() => {
          if (report) {
            exportMonthlyReportExcel(report, xlsxName);
            toast.success(t("xlsxOk"));
          }
        }}
        onExportEmail={() => emailMut.mutate()}
        emailDisabled={range !== "monthly" || emailMut.isPending}
      />

      {range === "monthly" && (
        <p className="text-xs text-muted-foreground">{t("emailNote")}</p>
      )}

      <AiInsightPanel surface="reports" />

      {/* Left filters (sidebar) · Right analytics (Stitch reports.html) */}
      <div className="grid grid-cols-12 gap-4 lg:items-start lg:gap-6">
        <div className="col-span-12 lg:col-span-3">
          <ReportFiltersPanel
            raw={activeRaw}
            filter={filter}
            setFilter={setFilter}
            range={range}
            variant="sidebar"
          />
        </div>

        <div className="col-span-12 flex min-w-0 flex-col gap-5 lg:col-span-9">
          <ReportForecastCompare />

          {range === "monthly" ? (
            <>
              <SummaryCards report={!isLoading ? report : undefined} />
              <InsightsPanel report={!isLoading ? report : undefined} />
            </>
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>{t("rangeSummaryTitle")}</CardTitle>
                <CardDescription>
                  {range === "yearly" ? t("rangeYearlyDesc") : t("rangeAllDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isActiveRangeLoading || !report ? (
                  <p className="text-sm text-muted-foreground">{tC("loading")}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t("rangeIncome")}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatMoney(report.summary.totalIncome)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t("rangeExpense")}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatMoney(report.summary.totalExpenses)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{t("rangeNet")}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatMoney(report.summary.netBalance)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {report && (
            <div>
              <h2 className="mb-2 text-base font-semibold min-[400px]:mb-3 min-[400px]:text-lg">
                {t("visual")}
              </h2>
              <ReportChartsLazy report={report} />
            </div>
          )}

          {report && (
            <>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>{t("expLines")}</CardTitle>
                  <CardDescription>{t("expLinesDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.expenseLineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noRows")}</p>
                  ) : (
                    <LedgerTable
                      caption={t("expLines")}
                      columns={[
                        { id: "date", header: tC("date"), width: "22%", tone: "muted" },
                        { id: "title", header: tC("title"), width: "28%", tone: "strong" },
                        { id: "category", header: tC("category"), width: "16%" },
                        { id: "method", header: tW("methodLabel"), width: "18%" },
                        { id: "amount", header: tC("amount"), width: "16%", align: "end", tone: "strong" },
                      ]}
                      rows={byDateDesc(report.expenseLineItems).map((e) => ({
                        id: e._id + e.source + String(e.date),
                        cells: {
                          date: formatDateDayMonth(new Date(e.date), locale),
                          title: e.title,
                          category: labelExpenseCategory(e.category, tCat),
                          method: (
                            <PaymentMethodLabel
                              method={e.paymentMethod}
                              className="text-sm text-foreground"
                            />
                          ),
                          amount: formatMoney(e.amount),
                        },
                      }))}
                    />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>{t("incLines")}</CardTitle>
                  <CardDescription>{t("incLinesDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="text-sm font-medium">{t("genInc")}</h3>
                  {report.incomeLineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tC("noneInView")}</p>
                  ) : (
                    <LedgerTable
                      caption={t("genInc")}
                      columns={[
                        { id: "date", header: tC("date"), width: "22%", tone: "muted" },
                        { id: "title", header: tC("title"), width: "34%", tone: "strong" },
                        { id: "method", header: tW("methodLabel"), width: "22%" },
                        { id: "amount", header: tC("amount"), width: "22%", align: "end", tone: "strong" },
                      ]}
                      rows={byDateDesc(report.incomeLineItems).map((r) => ({
                        id: r._id,
                        cells: {
                          date: formatDateDayMonth(new Date(r.date), locale),
                          title: r.title,
                          method: (
                            <PaymentMethodLabel
                              method={r.paymentMethod}
                              className="text-sm text-foreground"
                            />
                          ),
                          amount: formatMoney(r.amount),
                        },
                      }))}
                    />
                  )}

                  <h3 className="text-sm font-medium">{t("projPay")}</h3>
                  {report.projectLineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tC("noneInView")}</p>
                  ) : (
                    <LedgerTable
                      caption={t("projPay")}
                      columns={[
                        { id: "date", header: tC("date"), width: "22%", tone: "muted" },
                        { id: "project", header: tC("project"), width: "34%", tone: "strong" },
                        { id: "method", header: tW("methodLabel"), width: "22%" },
                        { id: "amount", header: tC("amount"), width: "22%", align: "end", tone: "strong" },
                      ]}
                      rows={byDateDesc(report.projectLineItems).map((r) => ({
                        id: r._id,
                        cells: {
                          date: formatDateDayMonth(new Date(r.date), locale),
                          project: r.name,
                          method: (
                            <PaymentMethodLabel
                              method={r.paymentMethod}
                              className="text-sm text-foreground"
                            />
                          ),
                          amount: formatMoney(r.amount),
                        },
                      }))}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
