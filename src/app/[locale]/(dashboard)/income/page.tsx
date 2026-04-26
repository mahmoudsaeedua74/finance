"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateMedium, monthLabel, formatMoney } from "@/lib/format";
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
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Row = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  incomeType: string;
};

export default function IncomeListPage() {
  const t = useTranslations("income");
  const tC = useTranslations("common");
  const locale = useLocale();
  const { year, month } = useMonth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["incomes", year, month],
    queryFn: () =>
      jsonFetch<{ data: Row[] }>(`/api/incomes?year=${year}&month=${month}`),
  });
  const rows = data?.data ?? [];

  const [edit, setEdit] = useState<Row | null>(null);
  const [tx, setTx] = useState("");
  const [a, setA] = useState("");
  const [d, setD] = useState("");
  const [ty, setTy] = useState("other");

  const del = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      qc.invalidateQueries({ queryKey: ["incomes", year, month] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: () => {
      if (!edit) return Promise.reject();
      return jsonFetch(`/api/incomes/${edit._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: tx,
          amount: parseFloat(a),
          date: new Date(d).toISOString(),
          incomeType: ty,
        }),
      });
    },
    onSuccess: () => {
      toast.success(tC("updated"));
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["incomes", year, month] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const typeLabel = (v: string) =>
    v === "salary" || v === "freelance" || v === "other" ? t(`types.${v}`) : v;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pageDesc", { month: monthLabel(year, month, locale) })}
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/income/new">
          {t("add")}
        </Link>
      </div>

      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t("lineTitle")}</CardTitle>
          <CardDescription>{t("lineDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tC("loading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRows")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("date")}</TableHead>
                    <TableHead>{tC("title")}</TableHead>
                    <TableHead>{t("table.type")}</TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateMedium(new Date(r.date), locale)}
                      </TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{typeLabel(r.incomeType)}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-end">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell className="space-x-1 text-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEdit(r);
                            setTx(r.title);
                            setA(String(r.amount));
                            setD(new Date(r.date).toISOString().slice(0, 10));
                            setTy(r.incomeType);
                          }}
                        >
                          {tC("edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(t("deleteQ"))) del.mutate(r._id);
                          }}
                        >
                          {tC("delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{tC("title")}</Label>
              <Input value={tx} onChange={(e) => setTx(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{tC("amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={a}
                onChange={(e) => setA(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{tC("date")}</Label>
              <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{tC("type")}</Label>
              <Select value={ty} onValueChange={(v) => v && setTy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">{t("types.salary")}</SelectItem>
                  <SelectItem value="freelance">{t("types.freelance")}</SelectItem>
                  <SelectItem value="other">{t("types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              {tC("close")}
            </Button>
            <Button onClick={() => update.mutate()}>{tC("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
