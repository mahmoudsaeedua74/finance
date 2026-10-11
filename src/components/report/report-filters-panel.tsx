"use client";

import { useMemo, useId, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Filter, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSelect } from "@/components/ui/app-select";
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
import { useMonth } from "@/context/month-context";

const filterLabelClass = "text-xs font-medium text-foreground/80";
const filterLabelSlotClass = "flex min-h-9 flex-col justify-end";

const filterSelectTriggerClass = "h-11 min-h-11";
const filterSelectTriggerSidebarClass = "h-11 min-h-11 rounded-lg";

type ReportFiltersPanelProps = {
  raw: MonthlyReportDto | undefined;
  filter: ReportFilterState;
  setFilter: Dispatch<SetStateAction<ReportFilterState>>;
  range: "monthly" | "yearly" | "all";
  /** Stitch-style compact sidebar (left column on lg+) vs full-width horizontal panel */
  variant?: "default" | "sidebar";
};

export function ReportFiltersPanel({
  raw,
  filter,
  setFilter,
  range,
  variant = "default",
}: ReportFiltersPanelProps) {
  const t = useTranslations("report");
  const tC = useTranslations("common");
  const tLayout = useTranslations("layout");
  const tCat = useTranslations("expense.categories");
  const tInc = useTranslations("income.types");
  const { year, month, setYearMonth } = useMonth();
  const monthFieldId = useId();
  const yearFieldId = useId();

  const yearChoices = useMemo(() => {
    const cy = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => cy - i);
  }, []);

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

  const sidebarUppercaseLabel = "block text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2";

  const fieldsGrid =
    variant === "sidebar"
      ? "flex flex-col gap-5"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end sm:gap-4 lg:grid-cols-12 lg:gap-x-4";

  const filterFields = (
    <>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-1.5",
          variant === "sidebar" ? "" : "sm:col-span-2 lg:col-span-3",
        )}
      >
        {variant === "sidebar" ? (
          <span className={sidebarUppercaseLabel}>{tC("search")}</span>
        ) : (
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
        )}
        <Input
          id="rep-search"
          value={filter.search}
          onChange={(e) =>
            setFilter((f) => ({ ...f, search: e.target.value }))
          }
          placeholder={t("phSearch")}
          className={cn(
            "h-11 w-full shadow-sm",
            variant === "sidebar"
              ? "rounded-lg border-border/80 bg-background"
              : "rounded-xl border-border/80 bg-background",
          )}
        />
      </div>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-1.5",
          variant === "sidebar" ? "" : "sm:col-span-1 lg:col-span-3",
        )}
      >
        {variant === "sidebar" ? (
          <span className={sidebarUppercaseLabel}>{t("expCat")}</span>
        ) : (
          <div className={filterLabelSlotClass}>
            <Label htmlFor="filter-expense-cat" className={filterLabelClass}>
              {t("expCat")}
            </Label>
            <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
              {t("filterCatSub")}
            </p>
          </div>
        )}
        <AppSelect
          id="filter-expense-cat"
          value={filter.expenseCategory}
          onValueChange={(v) =>
            setFilter((f) => ({ ...f, expenseCategory: v }))
          }
          aria-label={t("expCat")}
          triggerClassName={
            variant === "sidebar"
              ? filterSelectTriggerSidebarClass
              : filterSelectTriggerClass
          }
          options={[
            { value: "all", label: t("allCats") },
            ...EXPENSE_CATEGORY_PRESETS.map((c) => ({
              value: c,
              label: labelExpenseCategory(c, tCat),
            })),
            ...extraCategoryKeys.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-1.5",
          variant === "sidebar" ? "" : "sm:col-span-1 lg:col-span-3",
        )}
      >
        {variant === "sidebar" ? (
          <span className={sidebarUppercaseLabel}>{t("projInc")}</span>
        ) : (
          <div className={filterLabelSlotClass}>
            <Label htmlFor="filter-project" className={filterLabelClass}>
              {t("projInc")}
            </Label>
            <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
              {t("filterProjSub")}
            </p>
          </div>
        )}
        <AppSelect
          id="filter-project"
          value={filter.projectId}
          onValueChange={(v) => setFilter((f) => ({ ...f, projectId: v }))}
          aria-label={t("projInc")}
          triggerClassName={
            variant === "sidebar"
              ? filterSelectTriggerSidebarClass
              : filterSelectTriggerClass
          }
          options={[
            { value: "all", label: t("allProjs") },
            ...projectOptions.map((p) => ({
              value: p._id,
              label: `${p.name} (${formatMoney(p.amount)})`,
            })),
          ]}
        />
      </div>
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-1.5",
          variant === "sidebar" ? "" : "sm:col-span-2 lg:col-span-3",
        )}
      >
        {variant === "sidebar" ? (
          <span className={sidebarUppercaseLabel}>{t("incSource")}</span>
        ) : (
          <div className={filterLabelSlotClass}>
            <Label htmlFor="filter-income-src" className={filterLabelClass}>
              {t("incSource")}
            </Label>
            <p className="text-[0.7rem] leading-snug text-muted-foreground sm:text-xs">
              {t("filterIncSub")}
            </p>
          </div>
        )}
        <AppSelect
          id="filter-income-src"
          value={filter.incomeSource}
          onValueChange={(v) =>
            setFilter((f) => ({
              ...f,
              incomeSource: v as ReportFilterState["incomeSource"],
            }))
          }
          aria-label={t("incSource")}
          triggerClassName={
            variant === "sidebar"
              ? filterSelectTriggerSidebarClass
              : filterSelectTriggerClass
          }
          options={[
            { value: "all", label: t("allIncSources") },
            ...INCOME_TYPES.map((key) => ({
              value: key,
              label: tInc(key),
            })),
          ]}
        />
      </div>
    </>
  );

  if (variant === "sidebar") {
    return (
      <aside
        className="h-fit rounded-xl border border-border/80 bg-card p-4 shadow-sm lg:sticky lg:top-4"
        aria-label={t("filters")}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="size-[1.125rem]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight">{t("filters")}</h2>
            {!isReportFilterDefault(filter) && (
              <Badge variant="secondary" className="mt-1 text-[0.65rem]">
                {t("customView")}
              </Badge>
            )}
          </div>
        </div>

        {(range === "monthly" || range === "yearly") && (
          <div className="mb-4 space-y-4 border-b border-border/50 pb-4">
            {range === "monthly" && (
              <div className="space-y-2">
                <span className={sidebarUppercaseLabel}>{tLayout("goToMonth")}</span>
                <Input
                  id={monthFieldId}
                  type="month"
                  className="h-11 rounded-lg border-border/80 bg-background font-medium tabular-nums shadow-sm"
                  dir="ltr"
                  value={`${year}-${String(month).padStart(2, "0")}`}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const [y, m] = v.split("-").map(Number);
                    if (y && m >= 1 && m <= 12) setYearMonth(y, m);
                  }}
                />
              </div>
            )}
            {range === "yearly" && (
              <div className="space-y-2">
                <span className={sidebarUppercaseLabel}>{t("yearLabel")}</span>
                <AppSelect
                  id={yearFieldId}
                  value={String(year)}
                  onValueChange={(v) => setYearMonth(Number(v), month)}
                  aria-label={t("yearLabel")}
                  triggerClassName={filterSelectTriggerSidebarClass}
                  options={yearChoices.map((y) => ({
                    value: String(y),
                    label: String(y),
                  }))}
                />
              </div>
            )}
          </div>
        )}

        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t("filterDescShort")}</p>
        <div className={fieldsGrid}>{filterFields}</div>
        <div className="mt-4 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-center"
            onClick={() => setFilter(getDefaultReportFilters())}
          >
            <RotateCcw className="me-1.5 size-3.5" />
            {tC("reset")}
          </Button>
        </div>
      </aside>
    );
  }

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
        <div className={fieldsGrid}>{filterFields}</div>

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
