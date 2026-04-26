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
import { FileDown, FileSpreadsheet, Filter, Mail, RotateCcw, Sparkles } from "lucide-react";
import { exportMonthlyReportPdf } from "@/lib/export-pdf";
import { exportMonthlyReportExcel } from "@/lib/export-excel";
import { toast } from "sonner";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ReportChartsLazy } from "@/components/dashboard/report-charts-lazy";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyReportFilters,
  getDefaultReportFilters,
  getUniqueExpenseCategories,
  type ReportFilterState,
} from "@/lib/report-filters";
import { Separator } from "@/components/ui/separator";

function isFilterDefault(f: ReportFilterState) {
  return (
    f.expenseCategory === "all" &&
    f.projectId === "all" &&
    !f.search.trim() &&
    !f.quickSavingsOnly
  );
}

export default function ReportPage() {
  const t = useTranslations("report");
  const tC = useTranslations("common");
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
    if (isFilterDefault(filter)) return raw;
    return applyReportFilters(raw, filter);
  }, [raw, filter]);

  const categoryOptions = useMemo(
    () => (raw ? getUniqueExpenseCategories(raw) : []),
    [raw]
  );

  const projectOptions = useMemo(() => {
    if (!raw) return [];
    return raw.projectLineItems;
  }, [raw]);

  const filenameBase = `report-${year}-${String(month).padStart(2, "0")}`;
  const suffix = isFilterDefault(filter) ? "" : "-filtered";
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
    <div className="min-w-0 max-w-4xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold min-[400px]:text-2xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { month: monthLabel(year, month, locale) })}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-4" />
            <CardTitle className="text-base">{t("filters")}</CardTitle>
            {!isFilterDefault(filter) && <Badge variant="secondary">{t("customView")}</Badge>}
          </div>
          <CardDescription>{t("filterDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid min-[500px]:grid-cols-2 min-[800px]:grid-cols-4 min-[500px]:gap-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rep-search">{tC("search")}</Label>
              <Input
                id="rep-search"
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                placeholder={t("phSearch")}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("expCat")}</Label>
              <Select
                value={filter.expenseCategory}
                onValueChange={(v) => v && setFilter((f) => ({ ...f, expenseCategory: v }))}
              >
                <SelectTrigger className="min-h-11 w-full data-[size=default]:h-11">
                  <SelectValue placeholder={tC("all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCats")}</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("projInc")}</Label>
              <Select
                value={filter.projectId}
                onValueChange={(v) => v && setFilter((f) => ({ ...f, projectId: v }))}
              >
                <SelectTrigger className="min-h-11 w-full data-[size=default]:h-11">
                  <SelectValue placeholder={tC("all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allProjs")}</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({formatMoney(p.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-[500px]:col-span-2 min-[800px]:col-span-1 min-[500px]:flex-col min-[500px]:justify-end flex-col justify-end gap-2">
              <Button
                type="button"
                variant={filter.quickSavingsOnly ? "default" : "outline"}
                className="min-h-11 w-full touch-manipulation"
                onClick={() =>
                  setFilter((f) => ({ ...f, quickSavingsOnly: !f.quickSavingsOnly }))
                }
              >
                {t("savingsBtn")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilter(getDefaultReportFilters())}
            >
              <RotateCcw className="me-1 size-3.5" />
              {tC("reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                            <Badge variant="outline">{e.category}</Badge>
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
