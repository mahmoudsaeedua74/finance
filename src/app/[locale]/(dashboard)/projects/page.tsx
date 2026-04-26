"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, monthLabel, formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportProjectListExcel } from "@/lib/export-excel";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, ArrowUpDown, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Row = {
  _id: string;
  name: string;
  amount: number;
  date: string;
};

function EditP({
  row,
  onDone,
}: {
  row: Row;
  onDone: () => void;
}) {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const { year, month } = useMonth();
  const [name, setName] = useState(row.name);
  const [amount, setAmount] = useState(String(row.amount));
  const [date, setDate] = useState(new Date(row.date).toISOString().slice(0, 10));
  const save = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/projects/${row._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success(t("done"));
      qc.invalidateQueries({ queryKey: ["projects", year, month] });
      qc.invalidateQueries({ queryKey: ["projects", "all"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <div className="space-y-2">
        <div>
          <Label>{tC("name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t("incomeAmt")}</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label>{tC("date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          {tC("close")}
        </Button>
        <Button type="button" onClick={() => save.mutate()}>
          {tC("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const locale = useLocale();
  const { year, month } = useMonth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", year, month],
    queryFn: () =>
      jsonFetch<{ data: Row[] }>(`/api/projects?year=${year}&month=${month}`),
  });
  const { data: allQ } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: () => jsonFetch<{ data: Row[] }>("/api/projects"),
  });

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date(year, month - 1, 12).toISOString().slice(0, 10)
  );
  const [edit, setEdit] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const m = useMutation({
    mutationFn: () =>
      jsonFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success(t("saveOk"));
      setName("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["projects", year, month] });
      qc.invalidateQueries({ queryKey: ["projects", "all"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("removed"));
      qc.invalidateQueries({ queryKey: ["projects", year, month] });
      qc.invalidateQueries({ queryKey: ["projects", "all"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthRows = useMemo(() => data?.data ?? [], [data?.data]);
  const allRows = useMemo(() => allQ?.data ?? [], [allQ?.data]);

  const monthView = useMemo(() => {
    const filter = q.trim().toLowerCase();
    const filtered = filter
      ? monthRows.filter((r) => r.name.toLowerCase().includes(filter))
      : monthRows;
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return mult * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (sortBy === "amount") {
        return mult * (a.amount - b.amount);
      }
      return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  }, [monthRows, q, sortBy, sortDir]);

  const allView = useMemo(() => {
    const filter = q.trim().toLowerCase();
    const filtered = filter
      ? allRows.filter((r) => r.name.toLowerCase().includes(filter))
      : allRows;
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return mult * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      if (sortBy === "amount") {
        return mult * (a.amount - b.amount);
      }
      return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  }, [allRows, q, sortBy, sortDir]);

  const byName = useMemo(() => {
    const m2 = new Map<string, number>();
    for (const r of allRows) {
      m2.set(r.name, (m2.get(r.name) || 0) + r.amount);
    }
    return Array.from(m2.entries())
      .map(([n, total]) => ({ name: n, total }))
      .sort((a, b) => b.total - a.total);
  }, [allRows]);

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("desc", { month: monthLabel(year, month, locale) })}
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <div className="grid min-[480px]:grid-cols-2 min-[800px]:grid-cols-4 min-[800px]:gap-3 gap-3">
        <div className="min-[800px]:col-span-2">
          <Label className="sr-only">{tC("search")}</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              className="min-h-11 ps-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("phSearch")}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">{t("sortBy")}</Label>
          <Select
            value={sortBy}
            onValueChange={(v) => v && setSortBy(v as "date" | "name" | "amount")}
          >
            <SelectTrigger className="min-h-11 w-full data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t("sort.date")}</SelectItem>
              <SelectItem value="name">{t("sort.name")}</SelectItem>
              <SelectItem value="amount">{t("sort.amount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("order")}</Label>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-between"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            {sortDir === "asc" ? t("asc") : t("desc")}
            <ArrowUpDown className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 touch-manipulation"
          onClick={() => {
            exportProjectListExcel(
              allView,
              `projects-export-${year}-${String(month).padStart(2, "0")}.xlsx`
            );
            toast.success(t("excelOk"));
          }}
        >
          <FileSpreadsheet className="me-2 size-4" />
          {t("excel")}
        </Button>
      </div>

      {byName.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("allTime")}</CardTitle>
            <CardDescription>{t("allTimeDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {byName.map(({ name: n, total }) => (
                <Badge key={n} variant="secondary" className="text-sm">
                  {n}: {formatMoney(total)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
          <CardDescription>{t("addDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md space-y-3">
          <div className="space-y-1">
            <Label>{t("projName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{tC("amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{tC("date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button type="button" onClick={() => m.mutate()} disabled={!name || !amount}>
            {tC("save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inMonth", { month: monthLabel(year, month, locale) })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{tC("loading")}</p>
          ) : monthView.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noPayouts")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <p className="border-b px-2 py-1 text-sm text-muted-foreground">
                {t("subtotal")}{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(monthView.reduce((s, r) => s + r.amount, 0))}
                </span>
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("date")}</TableHead>
                    <TableHead>{tC("project")}</TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthView.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateLong(new Date(r.date), locale)}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>
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

      <Card>
        <CardHeader>
          <CardTitle>{t("allEntries")}</CardTitle>
          <CardDescription>{t("allDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {allView.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("allEmpty")}</p>
          ) : (
            <div className="max-h-80 max-w-full overflow-x-auto overflow-y-auto rounded-md border">
              <p className="border-b px-2 py-1 text-sm text-muted-foreground">
                {t("allTotal")} {formatMoney(allView.reduce((s, r) => s + r.amount, 0))}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("date")}</TableHead>
                    <TableHead>{tC("project")}</TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-20 text-end"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allView.map((r) => (
                    <TableRow key={r._id + "-a"}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateLong(new Date(r.date), locale)}
                      </TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>
                          {tC("edit")}
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
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>
          {edit && <EditP key={edit._id} row={edit} onDone={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
