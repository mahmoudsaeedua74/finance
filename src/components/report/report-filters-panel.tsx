"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Filter, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  getDefaultReportFilters,
  getReportCategorySelectOptions,
  getUniqueExpenseCategories,
  isReportFilterDefault,
  type ReportFilterState,
} from "@/lib/report-filters";
import { INCOME_TYPES } from "@/lib/income-types";
import {
  EXPENSE_CATEGORY_PRESETS,
  isPresetExpenseCategory,
  labelExpenseCategory,
} from "@/lib/expense-categories";
import type { MonthlyReportDto } from "@/types/report";

const filterLabelClass = "text-xs font-medium text-foreground/80";
const filterLabelSlotClass = "flex min-h-9 flex-col justify-end";

const reportSelectTriggerClass = cn(
  "h-11 w-full min-w-0 justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-left text-sm font-normal shadow-sm transition-[box-shadow,background-color,border-color] hover:border-border hover:bg-muted/40 data-[size=default]:h-11 data-placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
);

const reportSelectContentClass =
  "max-h-[min(22rem,70vh)] rounded-xl border border-border/50 bg-popover p-1.5 text-popover-foreground shadow-lg";

type ReportFiltersPanelProps = {
  raw: MonthlyReportDto | undefined;
  filter: ReportFilterState;
  setFilter: Dispatch<SetStateAction<ReportFilterState>>;
};

export function ReportFiltersPanel({ raw, filter, setFilter }: ReportFiltersPanelProps) {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const tInc = useTranslations("income.types");

  const monthCategoryKeys = useMemo(
    () => (raw ? getUniqueExpenseCategories(raw) : []),
    [raw]
  );
  const extraCategoryKeys = useMemo(
    () =>
      raw
        ? getReportCategorySelectOptions(monthCategoryKeys).filter(
            (c) => !isPresetExpenseCategory(c)
          )
        : [],
    [raw, monthCategoryKeys]
  );
  const projectOptions = useMemo(() => (raw ? raw.projectLineItems : []), [raw]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/15 shadow-sm">
      <div className="border-b border-border/60 bg-muted/25 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Filter className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                  {t("filters")}
                </h2>
                {!isReportFilterDefault(filter) && (
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end sm:gap-4 lg:grid-cols-12 lg:gap-x-4">
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <div className={filterLabelSlotClass}>
              <Label htmlFor="rep-search" className={filterLabelClass}>
                {tC("search")}
              </Label>
              <p className="text-[0.7rem] leading-snug text-transparent sm:text-xs" aria-hidden>
                .
              </p>
            </div>
            <Input
              id="rep-search"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder={t("phSearch")}
              className="h-11 w-full rounded-xl border-border/80 bg-background shadow-sm"
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <div className={filterLabelSlotClass}>
              <Label htmlFor="filter-expense-cat" className={filterLabelClass}>
                {t("expCat")}
              </Label>
              <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
                {t("filterCatSub")}
              </p>
            </div>
            <Select
              value={filter.expenseCategory}
              onValueChange={(v) => v && setFilter((f) => ({ ...f, expenseCategory: v }))}
            >
              <SelectTrigger className={reportSelectTriggerClass} id="filter-expense-cat">
                <SelectValue>
                  {filter.expenseCategory === "all"
                    ? t("allCats")
                    : labelExpenseCategory(filter.expenseCategory, tCat)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={reportSelectContentClass}
                align="start"
                sideOffset={6}
              >
                <SelectItem value="all" className="cursor-pointer rounded-lg py-2.5">
                  {t("allCats")}
                </SelectItem>
                <SelectSeparator className="my-1" />
                <SelectGroup>
                  {EXPENSE_CATEGORY_PRESETS.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="cursor-pointer rounded-lg py-2.5"
                      title={labelExpenseCategory(c, tCat)}
                    >
                      {labelExpenseCategory(c, tCat)}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {extraCategoryKeys.length > 0 && (
                  <>
                    <SelectSeparator className="my-1" />
                    <SelectLabel className="px-2 pt-0.5 pb-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("otherCatsThisMonth")}
                    </SelectLabel>
                    {extraCategoryKeys.map((c) => (
                      <SelectItem
                        key={c}
                        value={c}
                        className="cursor-pointer rounded-lg py-2.5"
                        title={c}
                      >
                        <span className="line-clamp-2 w-full min-w-0 break-words text-start whitespace-normal">
                          {c}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <div className={filterLabelSlotClass}>
              <Label htmlFor="filter-project" className={filterLabelClass}>
                {t("projInc")}
              </Label>
              <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
                {t("filterProjSub")}
              </p>
            </div>
            <Select
              value={filter.projectId}
              onValueChange={(v) => v && setFilter((f) => ({ ...f, projectId: v }))}
            >
              <SelectTrigger className={reportSelectTriggerClass} id="filter-project">
                <SelectValue>
                  {filter.projectId === "all"
                    ? t("allProjs")
                    : projectOptions.find((p) => p._id === filter.projectId)?.name ??
                      t("allProjs")}
                </SelectValue>
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
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <div className={filterLabelSlotClass}>
              <Label htmlFor="filter-income-src" className={filterLabelClass}>
                {t("incSource")}
              </Label>
              <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
                {t("filterIncSub")}
              </p>
            </div>
            <Select
              value={filter.incomeSource}
              onValueChange={(v) =>
                v && setFilter((f) => ({ ...f, incomeSource: v as ReportFilterState["incomeSource"] }))
              }
            >
              <SelectTrigger className={reportSelectTriggerClass} id="filter-income-src">
                <SelectValue>
                  {filter.incomeSource === "all" ? t("allIncSources") : tInc(filter.incomeSource)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={reportSelectContentClass}
                align="start"
                sideOffset={6}
              >
                <SelectItem value="all" className="cursor-pointer rounded-lg py-2.5">
                  {t("allIncSources")}
                </SelectItem>
                <SelectSeparator className="my-1" />
                {INCOME_TYPES.map((key) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className="cursor-pointer rounded-lg py-2.5"
                    title={tInc(key)}
                  >
                    {tInc(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  );
}
