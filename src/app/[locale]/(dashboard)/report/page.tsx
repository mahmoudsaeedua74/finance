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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  applyReportFilters,
  getDefaultReportFilters,
  getUniqueExpenseCategories,
  type ReportFilterState,
} from "@/lib/report-filters";
import { Separator } from "@/components/ui/separator";
import { labelExpenseCategory } from "@/lib/expense-categories";

const filterLabelClass = "text-xs font-medium text-foreground/80";

const reportSelectTriggerClass = cn(
  "h-11 w-full min-w-0 justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-left text-sm font-normal shadow-sm transition-[box-shadow,background-color,border-color] hover:border-border hover:bg-muted/40 data-[size=default]:h-11 data-placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
);

const reportSelectContentClass =
  "max-h-64 rounded-xl border border-border/50 bg-popover p-1.5 text-popover-foreground shadow-lg";

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
    <div className=" space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold min-[400px]:text-2xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { month: monthLabel(year, month, locale) })}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/15 shadow-sm">
        <div className="border-b border-border/60 bg-muted/25 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Filter className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                    {t("filters")}
                  </h2>
                  {!isFilterDefault(filter) && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {t("customView")}
                    </Badge>
                  )}
                </div>
                <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {t("filterDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12 lg:gap-x-4">
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-5">
              <Label htmlFor="rep-search" className={filterLabelClass}>
                {tC("search")}
              </Label>
              <Input
                id="rep-search"
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                placeholder={t("phSearch")}
                className="h-11 w-full rounded-xl border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
              <Label htmlFor="filter-expense-cat" className={filterLabelClass}>
                {t("expCat")}
              </Label>
              <Select
                value={filter.expenseCategory}
                onValueChange={(v) => v && setFilter((f) => ({ ...f, expenseCategory: v }))}
              >
                <SelectTrigger className={reportSelectTriggerClass} id="filter-expense-cat">
                  <SelectValue placeholder={t("allCats")} />
                </SelectTrigger>
                <SelectContent
                  className={reportSelectContentClass}
                  align="start"
                  sideOffset={6}
                >
                  <SelectItem value="all" className="cursor-pointer rounded-lg py-2.5">
                    {t("allCats")}
                  </SelectItem>
                  {categoryOptions.length > 0 && <SelectSeparator className="my-1" />}
                  {categoryOptions.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="cursor-pointer rounded-lg py-2.5"
                      title={labelExpenseCategory(c, tCat)}
                    >
                      <span className="line-clamp-2 w-full min-w-0 break-words text-start whitespace-normal">
                        {labelExpenseCategory(c, tCat)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
              <Label htmlFor="filter-project" className={filterLabelClass}>
                {t("projInc")}
              </Label>
              <Select
                value={filter.projectId}
                onValueChange={(v) => v && setFilter((f) => ({ ...f, projectId: v }))}
              >
                <SelectTrigger className={reportSelectTriggerClass} id="filter-project">
                  <SelectValue placeholder={t("allProjs")} />
                </SelectTrigger>
                <SelectContent
                  className={reportSelectContentClass}
                  align="start"
                  sideOffset={6}
                >
                  <SelectItem value="all" className="cursor-pointer rounded-lg py-2.5">
                    {t("allProjs")}
                  </SelectItem>
                  {projectOptions.length > 0 && <SelectSeparator className="my-1" />}
                  {projectOptions.map((p) => (
                    <SelectItem
                      key={p._id}
                      value={p._id}
                      className="cursor-pointer items-start gap-0 rounded-lg py-2.5"
                    >
                      <span className="flex w-full min-w-0 flex-col items-start gap-0.5 text-start">
                        <span className="w-full line-clamp-2 font-medium leading-snug break-words whitespace-normal">
                          {p.name}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatMoney(p.amount)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <Label className={cn(filterLabelClass, "leading-snug")}>
                {t("savingsLabel")}
              </Label>
              <Button
                type="button"
                variant={filter.quickSavingsOnly ? "default" : "outline"}
                className="h-11 w-full min-w-0 touch-manipulation rounded-xl px-2 text-sm leading-snug"
                aria-pressed={filter.quickSavingsOnly}
                onClick={() =>
                  setFilter((f) => ({ ...f, quickSavingsOnly: !f.quickSavingsOnly }))
                }
              >
                {t("savingsBtn")}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4 sm:mt-5 sm:pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => setFilter(getDefaultReportFilters())}
            >
              <RotateCcw className="me-1.5 size-3.5" />
              {tC("reset")}
            </Button>
          </div>
        </div>
      </section>

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
