"use client";

import { useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useInfiniteOffsetQuery } from "@/hooks/use-infinite-offset-query";
import { PaginatedListFooter } from "@/components/ui/paginated-list-footer";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  filterRowsByNameQuery,
  sortRowsByNameAmountDate,
} from "@/lib/sort-filter";
import { useTodayYearMonth } from "@/hooks/use-today-year-month";
import { toLocalYmd } from "@/lib/ymd";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, monthLabel, formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { exportProjectListExcel } from "@/lib/export-excel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, ArrowUpDown, Search, Plus, Loader2 } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const controlLabelClass = "text-xs text-foreground/80";
const controlLabelSlotClass = "flex min-h-5 items-center";

type Row = {
  _id: string;
  name: string;
  amount: number;
  date: string;
  note?: string;
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
  const { invalidateProjects } = useFinanceInvalidation();
  const [name, setName] = useState(row.name);
  const [amount, setAmount] = useState(String(row.amount));
  const [date, setDate] = useState(toLocalYmd(new Date(row.date)));
  const [note, setNote] = useState(row.note?.trim() ?? "");
  const save = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/projects/${row._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          note,
        }),
      }),
    onMutate: () => {
      const toastId = toast.loading(tC("savingChanges"));
      return { toastId };
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx?.toastId) {
        toast.success(t("done"), { id: ctx.toastId });
      } else {
        toast.success(t("done"));
      }
      invalidateProjects();
      onDone();
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.toastId) {
        toast.error(e.message, { id: ctx.toastId });
      } else {
        toast.error(e.message);
      }
    },
  });
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor={`edit-proj-name-${row._id}`}>{tC("name")}</Label>
          <Input
            id={`edit-proj-name-${row._id}`}
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor={`edit-proj-amt-${row._id}`}>{t("incomeAmt")}</Label>
          <Input
            id={`edit-proj-amt-${row._id}`}
            className="h-11"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor={`edit-proj-date-${row._id}`}>{tC("date")}</Label>
          <Input
            id={`edit-proj-date-${row._id}`}
            className="h-11"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor={`edit-proj-note-${row._id}`}>{t("lineNote")}</Label>
          <Textarea
            id={`edit-proj-note-${row._id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("lineNotePh")}
            rows={2}
            className="min-h-14"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0 sm:pt-0">
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            {tC("close")}
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!name.trim() || !amount || save.isPending}
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
      </div>
    </>
  );
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const locale = useLocale();
  const { year, month } = useTodayYearMonth();
  const { invalidateProjects } = useFinanceInvalidation();
  const {
    flatData: monthRowsRaw,
    isLoading,
    error,
    fetchNextPage: fetchNextMonth,
    hasNextPage: hasNextMonth,
    isFetchingNextPage: isFetchingMonth,
  } = useInfiniteOffsetQuery<Row>({
    queryKey: ["projects", year, month, "paged"],
    getUrl: (off, lim) =>
      `/api/projects?year=${year}&month=${month}&offset=${off}&limit=${lim}`,
  });
  const {
    flatData: allRows,
    fetchNextPage: fetchNextAll,
    hasNextPage: hasNextAll,
    isFetchingNextPage: isFetchingAll,
  } = useInfiniteOffsetQuery<Row>({
    queryKey: ["projects", "all", "paged"],
    getUrl: (off, lim) => `/api/projects?offset=${off}&limit=${lim}`,
  });
  const { data: plData } = useQuery({
    queryKey: ["projects", "monthPl", year, month],
    queryFn: () =>
      jsonFetch<{
        data: {
          rows: {
            key: string;
            label: string;
            received: number;
            spent: number;
            net: number;
          }[];
        };
      }>(`/api/projects/month-pl?year=${year}&month=${month}`),
  });
  const { data: sumAll } = useQuery({
    queryKey: ["projects", "summary", "all"],
    queryFn: () =>
      jsonFetch<{
        data: { byName: { name: string; total: number }[]; totalAmount: number };
      }>("/api/projects/summary"),
  });

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    toLocalYmd(new Date(year, month - 1, 12))
  );
  const [payoutNote, setPayoutNote] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const openAddDialog = useCallback(() => {
    setName("");
    setAmount("");
    setPayoutNote("");
    setDate(toLocalYmd(new Date(year, month - 1, 12)));
    setAddOpen(true);
  }, [year, month]);

  const m = useMutation({
    mutationFn: () =>
      jsonFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          note: payoutNote,
        }),
      }),
    onSuccess: () => {
      toast.success(t("saveOk"));
      setName("");
      setAmount("");
      setPayoutNote("");
      setAddOpen(false);
      invalidateProjects();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("removed"));
      invalidateProjects();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthView = useMemo(
    () =>
      sortRowsByNameAmountDate(filterRowsByNameQuery(monthRowsRaw, q), sortBy, sortDir),
    [monthRowsRaw, q, sortBy, sortDir]
  );

  const allView = useMemo(
    () => sortRowsByNameAmountDate(filterRowsByNameQuery(allRows, q), sortBy, sortDir),
    [allRows, q, sortBy, sortDir]
  );

  const byName = sumAll?.data?.byName ?? [];
  const projectPlRows = plData?.data?.rows ?? [];

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={t("title")}
        description={t("desc", { month: monthLabel(year, month, locale) })}
      />

      {error && <QueryErrorAlert error={error} />}

      {projectPlRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("plCardTitle")}</CardTitle>
            <CardDescription>
              {t("plCardDesc", { month: monthLabel(year, month, locale) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("project")}</TableHead>
                    <TableHead className="text-end">{t("plReceived")}</TableHead>
                    <TableHead className="text-end">{t("plSpent")}</TableHead>
                    <TableHead className="text-end">{t("plNet")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectPlRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(row.received)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">
                        {formatMoney(row.spent)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end tabular-nums font-medium",
                          row.net >= 0 ? "text-foreground" : "text-destructive"
                        )}
                      >
                        {formatMoney(row.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex w-full flex-wrap items-end gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 basis-full flex flex-col gap-2.5 lg:basis-[22rem]">
          <div className={controlLabelSlotClass}>
            <Label className={controlLabelClass} htmlFor="projects-search">
              {tC("search")}
            </Label>
          </div>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              id="projects-search"
              className="h-11 ps-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("phSearch")}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 basis-[12rem] flex flex-col gap-2.5">
          <div className={controlLabelSlotClass}>
            <Label className={controlLabelClass}>{t("sortBy")}</Label>
          </div>
          <Select
            value={sortBy}
            onValueChange={(v) => v && setSortBy(v as "date" | "name" | "amount")}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t("sort.date")}</SelectItem>
              <SelectItem value="name">{t("sort.name")}</SelectItem>
              <SelectItem value="amount">{t("sort.amount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 basis-[10.5rem] flex flex-col gap-2.5">
          <div className={controlLabelSlotClass}>
            <Label className={controlLabelClass}>{t("order")}</Label>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            {sortDir === "asc" ? t("asc") : t("desc")}
            <ArrowUpDown className="size-4 shrink-0" />
          </Button>
        </div>
        <div className="min-w-0 basis-full flex flex-col gap-2.5 sm:basis-auto">
          <div className={controlLabelSlotClass}>
            <Label className={controlLabelClass}>{tC("actions")}</Label>
          </div>
          <div className="flex min-w-0 gap-2 sm:justify-end">
            <Button
              type="button"
              className="h-11 min-w-0 flex-1 sm:flex-none"
              onClick={openAddDialog}
            >
              <Plus className="me-2 size-4 shrink-0" />
              {t("addButton")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              title={t("excel")}
              aria-label={t("excel")}
              className="h-11 w-11 shrink-0"
              onClick={() => {
                exportProjectListExcel(
                  allView,
                  `projects-export-${year}-${String(month).padStart(2, "0")}.xlsx`
                );
                toast.success(t("excelOk"));
              }}
            >
              <FileSpreadsheet className="size-4 shrink-0" />
              <span className="sr-only">{t("excel")}</span>
            </Button>
          </div>
        </div>
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
          <CardTitle>{t("inMonth", { month: monthLabel(year, month, locale) })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton columnShapes={["sm", "fill", "sm", "end", "end"]} rows={5} />
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
                    <TableHead className="hidden min-[480px]:table-cell">{t("lineNote")}</TableHead>
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
                      <TableCell className="hidden max-w-[12rem] truncate text-sm text-muted-foreground min-[480px]:table-cell">
                        {r.note?.trim() || "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex flex-wrap items-center justify-end gap-1">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {monthView.length > 0 && (
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
                    <TableHead className="hidden min-[480px]:table-cell">{t("lineNote")}</TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-32 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allView.map((r) => (
                    <TableRow key={r._id + "-a"}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateLong(new Date(r.date), locale)}
                      </TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="hidden max-w-[12rem] truncate text-sm text-muted-foreground min-[480px]:table-cell">
                        {r.note?.trim() || "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(r.amount)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex flex-wrap items-center justify-end gap-1">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {allView.length > 0 && (
                <PaginatedListFooter
                  hasNextPage={!!hasNextAll}
                  isFetchingNextPage={isFetchingAll}
                  onLoadMore={() => void fetchNextAll()}
                  labelLoadMore={tC("loadMore")}
                  labelLoading={tC("loadingMore")}
                  labelEnd={tC("endOfList")}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
            <DialogDescription>{t("addDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="add-proj-name">{t("projName")}</Label>
              <Input
                id="add-proj-name"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="add-proj-amt">{tC("amount")}</Label>
              <Input
                id="add-proj-amt"
                className="h-11"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="add-proj-date">{tC("date")}</Label>
              <Input
                id="add-proj-date"
                className="h-11"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="add-proj-note">{t("lineNote")}</Label>
              <Textarea
                id="add-proj-note"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder={t("lineNotePh")}
                rows={2}
                className="min-h-14"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                {tC("close")}
              </Button>
              <Button
                type="button"
                onClick={() => m.mutate()}
                disabled={!name.trim() || !amount}
              >
                {tC("save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("addDesc")}</DialogDescription>
          </DialogHeader>
          {edit && <EditP key={edit._id} row={edit} onDone={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
