"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { monthLabel, formatMoney, formatDateLong } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MonthlyReportDto } from "@/types/report";
import { FileDown, FileSpreadsheet, Mail, Sparkles } from "lucide-react";
import { exportMonthlyReportPdf } from "@/lib/export-pdf";
import { exportMonthlyReportExcel } from "@/lib/export-excel";
import { toast } from "sonner";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ReportChartsLazy } from "@/components/dashboard/report-charts-lazy";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Badge } from "@/components/ui/badge";
import {
  applyReportFilters,
  getDefaultReportFilters,
  isReportFilterDefault,
  type ReportFilterState,
} from "@/lib/report-filters";
import { Separator } from "@/components/ui/separator";
import { labelExpenseCategory } from "@/lib/expense-categories";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { ReportFiltersPanel } from "@/components/report/report-filters-panel";
import { ReportForecastCompare } from "@/components/report/report-forecast-compare";
import { useReports, type ReportFilterType } from "@/hooks/use-reports";
import { queryKeys } from "@/features/_lib/query-keys";

function combineReports(year: number, reports: MonthlyReportDto[]): MonthlyReportDto {
  const incomeByType: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};

  for (const r of reports) {
    for (const [k, v] of Object.entries(r.incomeByType)) {
      incomeByType[k] = (incomeByType[k] ?? 0) + v;
    }
    for (const [k, v] of Object.entries(r.expenseByCategory)) {
      expenseByCategory[k] = (expenseByCategory[k] ?? 0) + v;
    }
  }

  const totalIncome = reports.reduce((s, r) => s + r.summary.totalIncome, 0);
  const totalExpenses = reports.reduce((s, r) => s + r.summary.totalExpenses, 0);
  const totalIncomeFromIncomes = reports.reduce(
    (s, r) => s + r.summary.totalIncomeFromIncomes,
    0
  );
  const projectIncome = reports.reduce((s, r) => s + r.summary.projectIncome, 0);
  const salaryIncome = reports.reduce((s, r) => s + (r.summary.salaryIncome ?? 0), 0);

  const expenseLineItems = reports.flatMap((r) => r.expenseLineItems);
  const incomeLineItems = reports.flatMap((r) => r.incomeLineItems);
  const projectLineItems = reports.flatMap((r) => r.projectLineItems);

  const biggestExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];

  return {
    year,
    month: 0,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      totalIncomeFromIncomes,
      projectIncome,
      salaryIncome,
    },
    incomeByType,
    expenseByCategory,
    expenseLineItems,
    incomeLineItems,
    projectLineItems,
    insights: {
      overspent: totalExpenses > totalIncome,
      biggestExpenseCategory: biggestExpense
        ? { name: biggestExpense[0], amount: biggestExpense[1] }
        : null,
      moneyLeft: totalIncome - totalExpenses,
    },
    smartInsights: [],
  };
}

export default function ReportPage() {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const tInc = useTranslations("income");
  const tProj = useTranslations("projects");
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
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`
      ),
  });
  const summaryQ = useReports(range);
  const raw = data?.data;
  const ledgerQ = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () => jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
    enabled: range === "all",
  });
  const yearlyQ = useQuery({
    queryKey: ["report-yearly", year],
    enabled: range === "yearly",
    queryFn: async () => {
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      const results = await Promise.all(
        months.map((m) =>
          jsonFetch<{ data: MonthlyReportDto }>(`/api/reports/monthly?year=${year}&month=${m}`)
        )
      );
      return combineReports(
        year,
        results.map((r) => r.data)
      );
    },
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

  const incomeTypeLabel = (v: string) =>
    v === "salary" || v === "freelance" || v === "gam3eya" || v === "other"
      ? tInc(`types.${v}`)
      : v;

  const emailMut = useMutation({
    mutationFn: () =>
      jsonFetch("/api/email/monthly-report", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      }),
    onSuccess: () => toast.success(t("emailOk")),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className=" space-y-4 sm:space-y-6">
      <PageHeader
        title={t("title")}
        description={
          range === "monthly"
            ? t("subtitle", { month: monthLabel(year, month, locale) })
            : range === "yearly"
              ? t("subtitleYearly")
              : t("subtitleAll")
        }
        meta={
          range === "all" ? t("allTimeSinceStart") : undefined
        }
      />

      {error && range === "monthly" && <QueryErrorAlert error={error} />}
      {summaryQ.error && range !== "monthly" && (
        <QueryErrorAlert error={summaryQ.error} />
      )}
      {yearlyQ.error && range === "yearly" && <QueryErrorAlert error={yearlyQ.error} />}
      {ledgerQ.error && range === "all" && <QueryErrorAlert error={ledgerQ.error} />}

      <ReportFiltersPanel raw={activeRaw} filter={filter} setFilter={setFilter} range={range} />

      <ReportForecastCompare />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 touch-manipulation"
          disabled={!report}
          onClick={() => {
            if (report) {
              exportMonthlyReportPdf(report, pdfName);
              toast.success(t("pdfOk"));
            }
          }}
        >
          <FileDown className="me-2 size-4" />
          {t("pdf")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 touch-manipulation"
          disabled={!report}
          onClick={() => {
            if (report) {
              exportMonthlyReportExcel(report, xlsxName);
              toast.success(t("xlsxOk"));
            }
          }}
        >
          <FileSpreadsheet className="me-2 size-4" />
          {t("excel")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 touch-manipulation"
          disabled={range !== "monthly" || emailMut.isPending}
          onClick={() => emailMut.mutate()}
        >
          <Mail className="me-2 size-4" />
          {t("emailBtn")}
        </Button>
      </div>
      {range === "monthly" && (
        <p className="text-xs text-muted-foreground">{t("emailNote")}</p>
      )}

      {range === "monthly" ? (
        <>
          <SummaryCards report={!isLoading ? report : undefined} />
          <InsightsPanel report={!isLoading ? report : undefined} />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("rangeSummaryTitle")}</CardTitle>
            <CardDescription>{range === "yearly" ? t("rangeYearlyDesc") : t("rangeAllDesc")}</CardDescription>
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
          <h2 className="mb-2 min-[400px]:mb-3 min-[400px]:text-lg text-base font-medium">
            {t("visual")}
          </h2>
          <ReportChartsLazy report={report} />
        </div>
      )}

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("expLines")}</CardTitle>
              <CardDescription>{t("expLinesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {report.expenseLineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noRows")}</p>
              ) : (
                <div className="min-w-0 max-w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tC("date")}</TableHead>
                        <TableHead>{tC("title")}</TableHead>
                        <TableHead>{tC("category")}</TableHead>
                        <TableHead>{t("table.type")}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t("expenseProject")}</TableHead>
                        <TableHead className="text-end">{tC("amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenseLineItems.map((e) => (
                        <TableRow key={e._id + e.source + String(e.date)}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateLong(new Date(e.date), locale)}
                          </TableCell>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {labelExpenseCategory(e.category, tCat)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {t(`lineSource.${e.source}`)}
                          </TableCell>
                          <TableCell className="hidden max-w-[10rem] truncate text-sm text-muted-foreground sm:table-cell">
                            {e.projectName?.trim() || "—"}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatMoney(e.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("incLines")}</CardTitle>
              <CardDescription>{t("incLinesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-sm font-medium">{t("genInc")}</h3>
              {report.incomeLineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tC("noneInView")}</p>
              ) : (
                <div className="min-w-0 max-w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tC("date")}</TableHead>
                        <TableHead>{tC("title")}</TableHead>
                        <TableHead>{tC("type")}</TableHead>
                        <TableHead className="text-end">{tC("amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.incomeLineItems.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateLong(new Date(r.date), locale)}
                          </TableCell>
                          <TableCell>{r.title}</TableCell>
                          <TableCell className="text-sm">
                            {incomeTypeLabel(r.incomeType)}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatMoney(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <h3 className="text-sm font-medium">{t("projPay")}</h3>
              {report.projectLineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tC("noneInView")}</p>
              ) : (
                <div className="min-w-0 max-w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tC("date")}</TableHead>
                        <TableHead>{tC("project")}</TableHead>
                        <TableHead className="hidden sm:table-cell">{tProj("lineNote")}</TableHead>
                        <TableHead className="text-end">{tC("amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.projectLineItems.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateLong(new Date(r.date), locale)}
                          </TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:table-cell">
                            {r.note?.trim() || "—"}
                          </TableCell>
                          <TableCell className="text-end tabular-nums">
                            {formatMoney(r.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4" />
                {t("ideasTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("ideas1")}</p>
              <Separator />
              <p>{t("ideas2")}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
