"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { formatDateLong, formatDateMedium, monthLabel, formatMoney } from "@/lib/format";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseCategoryField } from "@/components/expense/expense-category-field";
import { ProjectSpendField } from "@/components/expense/project-spend-field";
import { labelExpenseCategory } from "@/lib/expense-categories";
import {
  useDeleteExpense,
  useExpensesForMonth,
  useExpenseTemplatesList,
  useUpdateExpense,
  type ExpenseRow,
} from "@/features/expenses/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { PaginatedListFooter } from "@/components/ui/paginated-list-footer";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Loader2 } from "lucide-react";

function KindBadge({ r }: { r: ExpenseRow }) {
  const t = useTranslations("expense");
  if (r.rowKind === "recurring")
    return <Badge variant="outline">{t("kinds.recurring")}</Badge>;
  if (r.rowKind === "fixed_once")
    return <Badge variant="secondary">{t("kinds.fixed")}</Badge>;
  return <Badge>{t("kinds.variable")}</Badge>;
}

function EditForm({
  row,
  onDone,
}: {
  row: ExpenseRow;
  onDone: () => void;
}) {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const save = useUpdateExpense(onDone);
  const [title, setTitle] = useState(row.title);
  const [amount, setAmount] = useState(String(row.amount));
  const [cat, setCat] = useState(row.category);
  const [date, setDate] = useState(
    (row.displayDate
      ? new Date(row.displayDate)
      : new Date(row.date)
    )
      .toISOString()
      .slice(0, 10)
  );
  const [vf, setVf] = useState(
    row.isTemplate
      ? new Date(row.validFrom!).toISOString().slice(0, 10)
      : date
  );
  const [vt, setVt] = useState(
    row.validTo ? new Date(row.validTo).toISOString().slice(0, 10) : ""
  );
  const [projectName, setProjectName] = useState(row.projectName?.trim() ?? "");

  return (
    <>
      {row.isTemplate ? (
        <div className="flex flex-col gap-3">
          <div>
            <Label>{tC("title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("formAmountPerMonth")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-cat-rec">{tC("category")}</Label>
            <ExpenseCategoryField
              id="edit-cat-rec"
              value={cat}
              onCategoryChange={setCat}
              className="h-11 w-full"
            />
          </div>
          <div>
            <Label>{t("table.from")}</Label>
            <Input type="date" value={vf} onChange={(e) => setVf(e.target.value)} />
          </div>
          <div>
            <Label>{t("endOpt")}</Label>
            <Input type="date" value={vt} onChange={(e) => setVt(e.target.value)} />
          </div>
          <ProjectSpendField
            id={`edit-proj-rec-${row._id}`}
            value={projectName}
            onChange={setProjectName}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <Label>{tC("title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{tC("amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-cat">{tC("category")}</Label>
            <ExpenseCategoryField
              id="edit-cat"
              value={cat}
              onCategoryChange={setCat}
              className="h-11 w-full"
            />
          </div>
          <div>
            <Label>{tC("date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <ProjectSpendField
            id={`edit-proj-${row._id}`}
            value={projectName}
            onChange={setProjectName}
          />
        </div>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" onClick={onDone} variant="outline" disabled={save.isPending}>
          {tC("close")}
        </Button>
        <Button
          type="button"
          onClick={() =>
            save.mutate({
              row,
              values: {
                title,
                amount: parseFloat(amount),
                category: cat,
                date,
                validFrom: vf,
                validTo: vt,
                projectName,
              },
            })
          }
          disabled={save.isPending}
        >
          {save.isPending ? (
            <>
              <Loader2 className="me-2 size-4 animate-spin" />
              {tC("saving")}
            </>
          ) : (
            tC("save")
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function ExpenseListPage() {
  const t = useTranslations("expense");
  const tR = useTranslations("report");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const locale = useLocale();
  const { year, month } = useMonth();
  const {
    flatData: rows,
    isLoading,
    error,
    fetchNextPage: fetchNextMonth,
    hasNextPage: hasNextMonth,
    isFetchingNextPage: isFetchingMonth,
  } = useExpensesForMonth();
  const {
    flatData: templateRows,
    fetchNextPage: fetchNextTmpl,
    hasNextPage: hasNextTmpl,
    isFetchingNextPage: isFetchingTmpl,
  } = useExpenseTemplatesList();
  const templates = templateRows.filter((r) => r.isTemplate) as ExpenseRow[];

  const [edit, setEdit] = useState<ExpenseRow | null>(null);

  const del = useDeleteExpense();

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSub", { month: monthLabel(year, month, locale) })}
        action={
          <Link className={cn(buttonVariants())} href="/expense/new">
            {t("add")}
          </Link>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      <Card>
        <CardHeader>
          <CardTitle>{t("thisMonth")}</CardTitle>
          <CardDescription>
            {t("thisMonthDesc", { month: monthLabel(year, month, locale) })}
          </CardDescription>
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

      <Card>
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
            <EditForm
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
