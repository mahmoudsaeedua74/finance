"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

export default function ReportPage() {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const locale = useLocale();
  const { year, month } = useMonth();
  const [filter, setFilter] = useState<ReportFilterState>(getDefaultReportFilters);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", year, month],
    queryFn: () =>
      jsonFetch<{ data: MonthlyReportDto }>(
        `/api/reports/monthly?year=${year}&month=${month}`
      ),
  });
  const raw = data?.data;

  const report = useMemo(() => {
    if (!raw) return undefined;
    if (isReportFilterDefault(filter)) return raw;
    return applyReportFilters(raw, filter);
  }, [raw, filter]);

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

  return (
    <div className=" space-y-4 sm:space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle", { month: monthLabel(year, month, locale) })}
      />

      {error && <QueryErrorAlert error={error} />}

      <ReportFiltersPanel raw={raw} filter={filter} setFilter={setFilter} />

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
          disabled={emailMut.isPending}
          onClick={() => emailMut.mutate()}
        >
          <Mail className="me-2 size-4" />
          {t("emailBtn")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("emailNote")}</p>

      {report?.budgetUsage && report.budgetUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget usage</CardTitle>
            <CardDescription>Spent vs monthly category limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.budgetUsage.map((b) => (
              <div key={b.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{b.category}</span>
                  <span className="text-muted-foreground">
                    {formatMoney(b.spent)} / {formatMoney(b.limit)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      b.status === "over"
                        ? "h-full bg-destructive"
                        : b.status === "warning"
                          ? "h-full bg-amber-500"
                          : "h-full bg-emerald-500"
                    }
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <SummaryCards report={!isLoading ? report : undefined} />
      <InsightsPanel report={!isLoading ? report : undefined} />

      <div>
        <h2 className="mb-2 min-[400px]:mb-3 min-[400px]:text-lg text-base font-medium">
          {t("visual")}
        </h2>
        <ReportChartsLazy report={!isLoading ? report : undefined} />
      </div>

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
                            {e.source.replace("_", " ")}
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
                          <TableCell className="text-sm">{r.incomeType}</TableCell>
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
