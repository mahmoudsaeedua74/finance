"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateMedium, formatMoney } from "@/lib/format";
import { exportTransactionsExcel } from "@/lib/export-excel";
import { labelExpenseCategory } from "@/lib/expense-categories";
import {
  Briefcase,
  Car,
  ChevronDown,
  FileSpreadsheet,
  Home,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { useInfiniteOffsetQuery } from "@/hooks/use-infinite-offset-query";
import { queryKeys } from "@/features/_lib/query-keys";
import { useDeleteExpense } from "@/features/expenses/hooks";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import {
  TransactionsEditDialogs,
  type RecIncomeFull,
  type TxEditOpen,
} from "@/components/transactions/transactions-edit-stack";

const PAGE_SIZE = 40;

const toolbarSelectClass =
  "h-11 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm outline-none transition-[box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 lg:h-10 lg:min-w-[10rem] lg:max-w-[12rem] lg:w-auto";

type IncomeRow = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category?: string;
};
type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  rowKind: "variable" | "fixed_once" | "recurring";
};
type TxRow = {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  direction: "income" | "expense";
  kind: "variable" | "fixed" | "recurring";
  /** Present when `id` starts with `ri-` — used for edit/delete recurring income */
  recurringIncomeRaw?: RecIncomeFull;
};

function TxDescriptionIcon({ row }: { row: TxRow }) {
  const cat = row.category.toLowerCase();
  const Icon =
    row.direction === "income"
      ? Briefcase
      : cat.includes("grocer") || cat.includes("food") || cat.includes("market")
        ? ShoppingCart
        : cat.includes("rent") || cat.includes("hous") || cat.includes("home")
          ? Home
          : cat.includes("transport") || cat.includes("car") || cat.includes("fuel")
            ? Car
            : ReceiptText;
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

function txRowToEdit(row: TxRow): TxEditOpen | null {
  if (row.id.startsWith("inc-")) return { kind: "income", mongoId: row.id.slice(4) };
  if (row.id.startsWith("exp-")) return { kind: "expense", mongoId: row.id.slice(4) };
  if (row.id.startsWith("re-")) return { kind: "expense", mongoId: row.id.slice(3) };
  if (row.id.startsWith("ri-")) {
    return row.recurringIncomeRaw ? { kind: "recIncome", raw: row.recurringIncomeRaw } : null;
  }
  return null;
}

export default function TransactionsPage() {
  const t = useTranslations("transactions");
  const tC = useTranslations("common");
  const tInc = useTranslations("income");
  const tExp = useTranslations("expense");
  const tCat = useTranslations("expense.categories");
  const locale = useLocale();
  const { invalidateIncomes } = useFinanceInvalidation();
  const deleteExpenseMut = useDeleteExpense();

  const [tab, setTab] = useState<"all" | "income" | "expense" | "recurring">("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState<"all" | "month" | "lastMonth" | "year">("month");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [txEdit, setTxEdit] = useState<TxEditOpen>(null);

  const deleteIncomeMut = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      invalidateIncomes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRecurringIncomeMut = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/recurring-incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      invalidateIncomes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const incomesInf = useInfiniteOffsetQuery<IncomeRow>({
    queryKey: [...queryKeys.incomes.all(), "transactions-feed"],
    pageSize: PAGE_SIZE,
    getUrl: (off, lim) => `/api/incomes?offset=${off}&limit=${lim}`,
  });

  const expenseLinesInf = useInfiniteOffsetQuery<ExpenseRow>({
    queryKey: [...queryKeys.expenses.allLineItems(), "transactions-feed"],
    pageSize: PAGE_SIZE,
    getUrl: (off, lim) => `/api/expenses?entries=1&offset=${off}&limit=${lim}`,
  });

  const recurringIncomesInf = useInfiniteOffsetQuery<RecIncomeFull>({
    queryKey: [...queryKeys.recurringIncomes(), "transactions-feed"],
    pageSize: PAGE_SIZE,
    getUrl: (off, lim) => `/api/recurring-incomes?offset=${off}&limit=${lim}`,
  });

  const expenseTemplatesInf = useInfiniteOffsetQuery<ExpenseRow>({
    queryKey: [...queryKeys.expenses.all(), "transactions-templates-feed"],
    pageSize: PAGE_SIZE,
    getUrl: (off, lim) => `/api/expenses?offset=${off}&limit=${lim}`,
  });

  const error =
    incomesInf.error ||
    expenseLinesInf.error ||
    recurringIncomesInf.error ||
    expenseTemplatesInf.error;

  const rows = useMemo<TxRow[]>(() => {
    const incomeRows: TxRow[] = incomesInf.flatData.map((r) => ({
      id: `inc-${r._id}`,
      date: r.date,
      title: r.title,
      category: r.category || "income",
      amount: r.amount,
      direction: "income",
      kind: "fixed",
    }));
    const expenseRows: TxRow[] = expenseLinesInf.flatData.map((r) => ({
      id: `exp-${r._id}`,
      date: r.date,
      title: r.title,
      category: r.category,
      amount: r.amount,
      direction: "expense",
      kind: r.rowKind === "fixed_once" ? "fixed" : r.rowKind,
    }));
    const recurringIncomeRows: TxRow[] = recurringIncomesInf.flatData.map((r) => ({
      id: `ri-${r._id}`,
      date: r.startDate,
      title: r.title,
      category: "income",
      amount: r.amount,
      direction: "income",
      kind: "recurring",
      recurringIncomeRaw: r,
    }));
    const recurringExpenseRows: TxRow[] = expenseTemplatesInf.flatData
      .filter((r) => r.rowKind === "recurring")
      .map((r) => ({
        id: `re-${r._id}`,
        date: r.date,
        title: r.title,
        category: r.category,
        amount: r.amount,
        direction: "expense",
        kind: "recurring",
      }));

    return [...incomeRows, ...expenseRows, ...recurringIncomeRows, ...recurringExpenseRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [
    incomesInf.flatData,
    expenseLinesInf.flatData,
    recurringIncomesInf.flatData,
    expenseTemplatesInf.flatData,
  ]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startThisYear = new Date(now.getFullYear(), 0, 1);

    return rows.filter((r) => {
      const d = new Date(r.date);
      const tabOk =
        tab === "all" ||
        (tab === "income" && r.direction === "income" && r.kind !== "recurring") ||
        (tab === "expense" && r.direction === "expense" && r.kind !== "recurring") ||
        (tab === "recurring" && r.kind === "recurring");
      if (!tabOk) return false;

      const queryOk =
        !query.trim() ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase());
      if (!queryOk) return false;

      const categoryOk = category === "all" || r.category === category;
      if (!categoryOk) return false;

      if (period === "all") return true;
      if (period === "year") return d >= startThisYear;
      if (period === "lastMonth") return d >= startLastMonth && d < startThisMonth;
      return d >= startThisMonth;
    });
  }, [rows, tab, query, category, period]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const allFetched =
    incomesInf.isFetched &&
    expenseLinesInf.isFetched &&
    recurringIncomesInf.isFetched &&
    expenseTemplatesInf.isFetched;

  const hasMoreCombined =
    !!incomesInf.hasNextPage ||
    !!expenseLinesInf.hasNextPage ||
    !!recurringIncomesInf.hasNextPage ||
    !!expenseTemplatesInf.hasNextPage;

  const fetchingNext =
    incomesInf.isFetchingNextPage ||
    expenseLinesInf.isFetchingNextPage ||
    recurringIncomesInf.isFetchingNextPage ||
    expenseTemplatesInf.isFetchingNextPage;

  const incomesInfRef = useRef(incomesInf);
  const expenseLinesInfRef = useRef(expenseLinesInf);
  const recurringIncomesInfRef = useRef(recurringIncomesInf);
  const expenseTemplatesInfRef = useRef(expenseTemplatesInf);
  incomesInfRef.current = incomesInf;
  expenseLinesInfRef.current = expenseLinesInf;
  recurringIncomesInfRef.current = recurringIncomesInf;
  expenseTemplatesInfRef.current = expenseTemplatesInf;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !allFetched) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void incomesInfRef.current.fetchNextPage();
        void expenseLinesInfRef.current.fetchNextPage();
        void recurringIncomesInfRef.current.fetchNextPage();
        void expenseTemplatesInfRef.current.fetchNextPage();
      },
      { root: null, rootMargin: "280px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allFetched]);

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.warning(t("exportExcelEmpty"));
      return;
    }
    const toastId = toast.loading(t("exportExcelLoading"));
    window.requestAnimationFrame(() => {
      try {
        const stamp = new Date().toISOString().slice(0, 10);
        exportTransactionsExcel(
          filtered.map((r) => ({
            date: r.date,
            title: r.title,
            categoryLabel:
              r.direction === "expense" ? labelExpenseCategory(r.category, tCat) : r.category,
            kindLabel: t(`kinds.${r.kind}`),
            directionLabel:
              r.direction === "income" ? t("excelDirectionIncome") : t("excelDirectionExpense"),
            amount: r.amount,
          })),
          `transactions-${stamp}.xlsx`,
        );
        toast.success(t("exportExcelDone"), { id: toastId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("exportExcelFail"), { id: toastId });
      }
    });
  };

  const handleEditRow = (row: TxRow) => {
    const next = txRowToEdit(row);
    if (next) setTxEdit(next);
  };

  const handleDeleteRow = (row: TxRow) => {
    if (row.id.startsWith("inc-")) {
      if (!confirm(tInc("deleteQ"))) return;
      deleteIncomeMut.mutate(row.id.slice(4));
      return;
    }
    if (row.id.startsWith("exp-")) {
      if (!confirm(tExp("deleteEntry"))) return;
      deleteExpenseMut.mutate(row.id.slice(4));
      return;
    }
    if (row.id.startsWith("re-")) {
      if (!confirm(tExp("deleteRule"))) return;
      deleteExpenseMut.mutate(row.id.slice(3));
      return;
    }
    if (row.id.startsWith("ri-")) {
      const rid = row.recurringIncomeRaw?._id;
      if (!rid) return;
      if (!confirm(tInc("deleteRecurringQ"))) return;
      deleteRecurringIncomeMut.mutate(rid);
    }
  };

  const mutatingDelete =
    deleteIncomeMut.isPending || deleteExpenseMut.isPending || deleteRecurringIncomeMut.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t("title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("desc")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-10 gap-2 rounded-xl border-border/70 bg-muted/40 px-4 shadow-sm transition-all",
              "hover:border-emerald-500/35 hover:bg-muted/70 hover:shadow-md active:scale-[0.98]",
            )}
            onClick={exportExcel}
          >
            <FileSpreadsheet className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="font-medium">{t("excelExport")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "h-10 gap-1.5 rounded-xl px-4 font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98]",
              )}
            >
              <Plus className="size-4" />
              {t("addTransaction")}
              <ChevronDown className="size-4 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem] rounded-xl">
              <DropdownMenuItem onClick={() => setTxEdit({ kind: "income", mode: "create" })}>
                {t("addIncome")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTxEdit({ kind: "expense", mode: "create" })}>
                {t("addExpense")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error ? <QueryErrorAlert error={error as Error} /> : null}

      <Card className="border-border/70 shadow-md shadow-black/[0.04] ring-1 ring-border/40 dark:shadow-black/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-4">
            <div className="flex shrink-0 flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/35 p-1.5 shadow-inner shadow-black/[0.03] dark:bg-muted/25">
              {(["all", "income", "expense", "recurring"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={tab === k ? "secondary" : "ghost"}
                  className={cn(
                    "h-9 rounded-lg px-3 text-sm shadow-none",
                    tab === k && "bg-background shadow-sm ring-1 ring-border/60",
                  )}
                  onClick={() => setTab(k)}
                >
                  {t(`tabs.${k}`)}
                </Button>
              ))}
            </div>

            <div
              className={cn(
                "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-border/80 bg-background px-4 py-2.5 shadow-sm transition-[box-shadow,border-color]",
                "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/35 dark:bg-input/30",
                "lg:h-10 lg:max-w-[min(100%,300px)]",
              )}
            >
              <Search className="size-4 shrink-0 text-muted-foreground/80" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPh")}
                dir="auto"
                autoComplete="off"
                className={cn(
                  "min-h-0 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none outline-none",
                  "text-base md:text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "disabled:bg-transparent md:min-h-0 dark:bg-transparent dark:disabled:bg-transparent",
                )}
                aria-label={tC("search")}
              />
            </div>

            <select
              className={toolbarSelectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t("allCategories")}
            >
              <option value="all">{t("allCategories")}</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className={toolbarSelectClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              aria-label={t("periodAria")}
            >
              <option value="month">{t("period.month")}</option>
              <option value="lastMonth">{t("period.lastMonth")}</option>
              <option value="year">{t("period.year")}</option>
              <option value="all">{t("period.all")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-md shadow-black/[0.04] ring-1 ring-border/40 dark:shadow-black/30">
        <CardContent className="p-0">
          {!allFetched ? (
            <div className="p-4">
              <DataTableSkeleton columnShapes={["sm", "fill", "sm", "sm", "end", "xs"]} rows={8} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{tC("date")}</th>
                      <th className="px-4 py-3 font-medium">{tC("title")}</th>
                      <th className="px-4 py-3 font-medium">{tC("category")}</th>
                      <th className="px-4 py-3 font-medium">{t("type")}</th>
                      <th className="px-4 py-3 text-end font-medium">{tC("amount")}</th>
                      <th className="w-14 px-2 py-3 text-end font-medium">{tC("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDateMedium(new Date(r.date), locale)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            <TxDescriptionIcon row={r} />
                            <span className="font-medium text-foreground">{r.title}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="rounded-md font-normal">
                            {r.direction === "expense" ? labelExpenseCategory(r.category, tCat) : r.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="rounded-md font-normal">
                            {t(`kinds.${r.kind}`)}
                          </Badge>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-end text-sm font-semibold tabular-nums",
                            r.direction === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground",
                          )}
                        >
                          {r.direction === "income" ? "+" : "−"}
                          {formatMoney(r.amount)}
                        </td>
                        <td className="px-2 py-2 text-end align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              disabled={mutatingDelete}
                              aria-label={tC("actions")}
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "icon" }),
                                "size-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem] rounded-xl">
                              <DropdownMenuItem
                                className="rounded-lg gap-2"
                                onClick={() => handleEditRow(r)}
                              >
                                <Pencil className="size-4 opacity-70" />
                                {tC("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                className="rounded-lg gap-2"
                                onClick={() => handleDeleteRow(r)}
                              >
                                <Trash2 className="size-4 opacity-90" />
                                {tC("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          {t("empty")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div
                ref={sentinelRef}
                className="flex min-h-14 flex-col items-center justify-center gap-2 border-t bg-muted/10 px-4 py-3"
              >
                {fetchingNext ? (
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("loadingMore")}
                  </span>
                ) : null}
                <p className="text-center text-xs text-muted-foreground">
                  {hasMoreCombined ? t("footerMore", { shown: filtered.length }) : t("footerEnd", { shown: filtered.length })}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TransactionsEditDialogs edit={txEdit} onClose={() => setTxEdit(null)} />
    </div>
  );
}
