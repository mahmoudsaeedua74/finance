"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDateLong, formatDateMedium, formatMoney } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseEditForm } from "@/components/expense/expense-edit-form";
import { labelExpenseCategory } from "@/lib/expense-categories";
import {
  useDeleteExpense,
  useExpenseAllLineItems,
  useExpenseTemplatesList,
  type ExpenseRow,
} from "@/features/expenses/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { PaginatedListFooter } from "@/components/ui/paginated-list-footer";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ReceiptText, CalendarSync, TrendingDown, Scale } from "lucide-react";

function KindBadge({ r }: { r: ExpenseRow }) {
  const t = useTranslations("expense");
  if (r.rowKind === "recurring")
    return <Badge variant="outline">{t("kinds.recurring")}</Badge>;
  if (r.rowKind === "fixed_once")
    return <Badge variant="secondary">{t("kinds.fixed")}</Badge>;
  return <Badge>{t("kinds.variable")}</Badge>;
}

export default function ExpenseListPage() {
  const t = useTranslations("expense");
  const tR = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const locale = useLocale();
  const {
    flatData: rows,
    isLoading,
    error,
    fetchNextPage: fetchNextMonth,
    hasNextPage: hasNextMonth,
    isFetchingNextPage: isFetchingMonth,
  } = useExpenseAllLineItems();
  const {
    flatData: templateRows,
    fetchNextPage: fetchNextTmpl,
    hasNextPage: hasNextTmpl,
    isFetchingNextPage: isFetchingTmpl,
  } = useExpenseTemplatesList();
  const templates = templateRows.filter((r) => r.isTemplate) as ExpenseRow[];

  const [edit, setEdit] = useState<ExpenseRow | null>(null);

  const del = useDeleteExpense();

  const totalRows = rows.length;
  const totalRecurring = templates.length;
  const monthSpend = rows.reduce((sum, r) => sum + r.amount, 0);
  const recurringPerMonth = templates.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubAll")}
        action={
          <Link className={cn(buttonVariants())} href="/expense/new">
            {t("add")}
          </Link>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Entries</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{totalRows}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <ReceiptText className="size-3.5" />
            Total line items
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Recurring templates</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{totalRecurring}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarSync className="size-3.5" />
            Active rules
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Current list total</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-rose-600 dark:text-rose-400">
              {formatMoney(monthSpend)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="size-3.5" />
            Sum of loaded rows
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Recurring per month</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{formatMoney(recurringPerMonth)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <Scale className="size-3.5" />
            Estimated monthly fixed load
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("lineItemsTitle")}</CardTitle>
          <CardDescription>{t("lineItemsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton
              columnShapes={["sm", "fill", "xs", "md", "sm", "end", "end"]}
              rows={6}
            />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRows")}</p>
          ) : (
            <div className="-mx-1 w-full overflow-x-auto px-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("when")}</TableHead>
                    <TableHead>{tC("title")}</TableHead>
                    <TableHead>{t("table.kind")}</TableHead>
                    <TableHead>{tC("category")}</TableHead>
                    <TableHead className="hidden min-[520px]:table-cell">{tR("expenseProject")}</TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const when = r.displayDate
                      ? new Date(r.displayDate)
                      : new Date(r.date);
                    return (
                      <TableRow key={r._id + (r.displayDate ?? "")}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {r.rowKind === "recurring"
                            ? t("recurringWhen")
                            : formatDateMedium(when, locale)}
                        </TableCell>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell>
                          <KindBadge r={r} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {labelExpenseCategory(r.category, tCat)}
                        </TableCell>
                        <TableCell className="hidden max-w-[10rem] truncate text-sm text-muted-foreground min-[520px]:table-cell">
                          {r.projectName?.trim() || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-end">
                          {formatMoney(r.amount)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEdit(r);
                            }}
                          >
                            {tC("edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t("deleteEntry"))) del.mutate(r._id);
                            }}
                          >
                            {tC("delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {rows.length > 0 && (
                <PaginatedListFooter
                  hasNextPage={!!hasNextMonth}
                  isFetchingNextPage={isFetchingMonth}
                  onLoadMore={() => void fetchNextMonth()}
                  labelLoadMore={tC("loadMore")}
                  labelLoading={tC("loadingMore")}
                  labelEnd={tC("endOfList")}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("recurring")}</CardTitle>
          <CardDescription>{t("recurringDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecurring")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("title")}</TableHead>
                    <TableHead>{tC("category")}</TableHead>
                    <TableHead>{t("table.from")}</TableHead>
                    <TableHead>{t("table.to")}</TableHead>
                    <TableHead className="hidden md:table-cell">{tR("expenseProject")}</TableHead>
                    <TableHead className="text-end">{t("table.perMonth")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tm) => {
                    const tr = tm;
                    return (
                      <TableRow key={tr._id}>
                        <TableCell className="font-medium">{tr.title}</TableCell>
                        <TableCell>
                        {labelExpenseCategory(tr.category, tCat)}
                      </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tr.validFrom
                            ? formatDateLong(new Date(tr.validFrom), locale)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tr.validTo ? formatDateLong(new Date(tr.validTo), locale) : "∞"}
                        </TableCell>
                        <TableCell className="hidden max-w-[8rem] truncate text-sm text-muted-foreground md:table-cell">
                          {tr.projectName?.trim() || "—"}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {formatMoney(tr.amount)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEdit({ ...tr, rowKind: "recurring" })}
                          >
                            {tC("edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t("deleteRule"))) del.mutate(tr._id);
                            }}
                          >
                            {tC("delete")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {templates.length > 0 && (
                <PaginatedListFooter
                  hasNextPage={!!hasNextTmpl}
                  isFetchingNextPage={isFetchingTmpl}
                  onLoadMore={() => void fetchNextTmpl()}
                  labelLoadMore={tC("loadMore")}
                  labelLoading={tC("loadingMore")}
                  labelEnd={tC("endOfList")}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <ExpenseEditForm
              key={edit._id + (edit.isTemplate ? "-t" : "-o")}
              row={edit}
              onDone={() => setEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
