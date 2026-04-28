"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Filter, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  getDefaultReportFilters,
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
import { useCategories } from "@/hooks/use-categories";

const filterLabelClass = "text-xs font-medium text-foreground/80";
const filterLabelSlotClass = "flex min-h-9 flex-col justify-end";

const nativeSelectClass = cn(
  "h-11 w-full min-w-0 rounded-xl border border-border/80 bg-background px-3 text-left text-sm shadow-sm transition-[box-shadow,background-color,border-color] hover:border-border hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40",
);

type ReportFiltersPanelProps = {
  raw: MonthlyReportDto | undefined;
  filter: ReportFilterState;
  setFilter: Dispatch<SetStateAction<ReportFilterState>>;
  range: "monthly" | "yearly" | "all";
};

export function ReportFiltersPanel({
  raw,
  filter,
  setFilter,
}: ReportFiltersPanelProps) {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const tInc = useTranslations("income.types");

  const monthCategoryKeys = useMemo(
    () => (raw ? getUniqueExpenseCategories(raw) : []),
    [raw],
  );
  const expenseCatQ = useCategories("expense");
  const categoryOptions = useMemo(() => {
    const fromApi = (expenseCatQ.data?.data ?? []).map((c) => c.name);
    const fromMonth = monthCategoryKeys;
    const all = Array.from(
      new Set([...EXPENSE_CATEGORY_PRESETS, ...fromApi, ...fromMonth]),
    );
    return all.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [expenseCatQ.data?.data, monthCategoryKeys]);
  const extraCategoryKeys = useMemo(
    () => categoryOptions.filter((c) => !isPresetExpenseCategory(c)),
    [categoryOptions],
  );
  const projectOptions = useMemo(
    () => (raw ? raw.projectLineItems : []),
    [raw],
  );

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
              <p
                className="text-[0.7rem] leading-snug text-transparent sm:text-xs"
                aria-hidden
              >
                .
              </p>
            </div>
            <Input
              id="rep-search"
              value={filter.search}
              onChange={(e) =>
                setFilter((f) => ({ ...f, search: e.target.value }))
              }
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
            <select
              id="filter-expense-cat"
              className={nativeSelectClass}
              value={filter.expenseCategory}
              onChange={(e) =>
                setFilter((f) => ({ ...f, expenseCategory: e.target.value }))
              }
            >
              <option value="all">{t("allCats")}</option>
              {EXPENSE_CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c}>
                  {labelExpenseCategory(c, tCat)}
                </option>
              ))}
              {extraCategoryKeys.length > 0 && (
                <optgroup label={t("otherCatsThisMonth")}>
                  {extraCategoryKeys.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
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
            <select
              id="filter-project"
              className={nativeSelectClass}
              value={filter.projectId}
              onChange={(e) =>
                setFilter((f) => ({ ...f, projectId: e.target.value }))
              }
            >
              <option value="all">{t("allProjs")}</option>
              {projectOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({formatMoney(p.amount)})
                </option>
              ))}
            </select>
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
            <select
              id="filter-income-src"
              className={nativeSelectClass}
              value={filter.incomeSource}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  incomeSource: e.target
                    .value as ReportFilterState["incomeSource"],
                }))
              }
            >
              <option value="all">{t("allIncSources")}</option>
              {INCOME_TYPES.map((key) => (
                <option key={key} value={key}>
                  {tInc(key)}
                </option>
              ))}
            </select>
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
