"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
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
import { toast } from "sonner";
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

type Row = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom?: string;
  validTo?: string | null;
  rowKind: "variable" | "fixed_once" | "recurring";
  displayDate?: string;
};

function KindBadge({ r }: { r: Row }) {
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
  row: Row;
  onDone: () => void;
}) {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const { year, month } = useMonth();
  const qc = useQueryClient();
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

  const save = useMutation({
    mutationFn: () => {
      if (row.isTemplate) {
        return jsonFetch(`/api/expenses/${row._id}`, {
          method: "PUT",
          body: JSON.stringify({
            title,
            amount: parseFloat(amount),
            category: cat,
            validFrom: new Date(vf).toISOString(),
            validTo: vt ? new Date(vt).toISOString() : null,
            recurring: true,
            isTemplate: true,
            kind: "fixed",
          }),
        });
      }
      return jsonFetch(`/api/expenses/${row._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          category: cat,
          date: new Date(date).toISOString(),
          kind: row.rowKind === "variable" ? "variable" : "fixed",
        }),
      });
    },
    onSuccess: () => {
      toast.success(tC("updated"));
      qc.invalidateQueries({ queryKey: ["expenses", year, month] });
      qc.invalidateQueries({ queryKey: ["expenses", "all"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {row.isTemplate ? (
        <div className="space-y-3">
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
            <Label>{tC("category")}</Label>
            <Input value={cat} onChange={(e) => setCat(e.target.value)} />
          </div>
          <div>
            <Label>{t("table.from")}</Label>
            <Input type="date" value={vf} onChange={(e) => setVf(e.target.value)} />
          </div>
          <div>
            <Label>{t("endOpt")}</Label>
            <Input type="date" value={vt} onChange={(e) => setVt(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
            <Label>{tC("category")}</Label>
            <Input value={cat} onChange={(e) => setCat(e.target.value)} />
          </div>
          <div>
            <Label>{tC("date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" onClick={onDone} variant="outline">
          {tC("close")}
        </Button>
        <Button type="button" onClick={() => save.mutate()}>
          {tC("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function ExpenseListPage() {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const locale = useLocale();
  const { year, month } = useMonth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["expenses", year, month],
    queryFn: () =>
      jsonFetch<{ data: Row[] }>(`/api/expenses?year=${year}&month=${month}`),
  });
  const { data: allData } = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: () => jsonFetch<{ data: Row[] }>("/api/expenses"),
  });

  const rows = data?.data ?? [];
  const templates = (allData?.data ?? []).filter((r) => r.isTemplate) as Row[];

  const [edit, setEdit] = useState<Row | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      qc.invalidateQueries({ queryKey: ["expenses", year, month] });
      qc.invalidateQueries({ queryKey: ["expenses", "all"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pageSub", { month: monthLabel(year, month, locale) })}
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/expense/new">
          {t("add")}
        </Link>
      </div>

      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t("thisMonth")}</CardTitle>
          <CardDescription>
            {t("thisMonthDesc", { month: monthLabel(year, month, locale) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tC("loading")}</p>
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
                        <TableCell className="text-sm">{r.category}</TableCell>
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
                    <TableHead className="text-end">{t("table.perMonth")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tm) => {
                    const tr = tm as Row;
                    return (
                      <TableRow key={tr._id}>
                        <TableCell className="font-medium">{tr.title}</TableCell>
                        <TableCell>{tr.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tr.validFrom
                            ? formatDateLong(new Date(tr.validFrom), locale)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tr.validTo ? formatDateLong(new Date(tr.validTo), locale) : "∞"}
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
