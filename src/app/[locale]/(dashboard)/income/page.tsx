"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useInfiniteOffsetQuery } from "@/hooks/use-infinite-offset-query";
import { PaginatedListFooter } from "@/components/ui/paginated-list-footer";
import { useLocale, useTranslations } from "next-intl";
import { queryKeys } from "@/features/_lib/query-keys";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateMedium, formatMoney } from "@/lib/format";
import { toLocalYmd, defaultFormDateYmd } from "@/lib/ymd";
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
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Loader2 } from "lucide-react";
import { Wallet, TrendingUp, Scale, BanknoteArrowDown } from "lucide-react";
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
import type { MonthlyReportDto } from "@/types/report";

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
  const { invalidateIncomes } = useFinanceInvalidation();
  const {
    flatData: rows,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOffsetQuery<Row>({
    queryKey: queryKeys.incomes.all(),
    getUrl: (off, lim) => `/api/incomes?offset=${off}&limit=${lim}`,
  });

  const { data: ledgerRes, isLoading: ledgerLoading } = useQuery({
    queryKey: queryKeys.ledgerReport(),
    queryFn: () => jsonFetch<{ data: MonthlyReportDto }>("/api/summary/ledger"),
  });
  const ledger = ledgerRes?.data;
  const S = ledger?.summary;
  const sat = S?.salaryIncomeAllTime ?? 0;
  const netFromSal = S ? sat - S.totalExpenses : 0;
  type RecRow = {
    _id: string;
    title: string;
    amount: number;
    frequency: "monthly" | "weekly";
    active: boolean;
    startDate: string;
    endDate: string | null;
    payDayOfMonth: number;
    incomeType: string;
  };
  const {
    flatData: recurringRows,
    fetchNextPage: fetchNextRecurring,
    hasNextPage: hasNextRecurring,
    isFetchingNextPage: isFetchingRecurring,
  } = useInfiniteOffsetQuery<RecRow>({
    queryKey: queryKeys.recurringIncomes(),
    getUrl: (off, lim) => `/api/recurring-incomes?offset=${off}&limit=${lim}`,
  });

  const [edit, setEdit] = useState<Row | null>(null);
  const [tx, setTx] = useState("");
  const [a, setA] = useState("");
  const [d, setD] = useState("");
  const [ty, setTy] = useState("other");
  const [rt, setRt] = useState("");
  const [ra, setRa] = useState("");
  const [rIncomeType, setRIncomeType] = useState("salary");
  const [rPay, setRPay] = useState(() =>
    String(Math.min(30, Math.max(1, new Date().getDate())))
  );
  const [rf, setRf] = useState<"monthly" | "weekly">("monthly");
  const [rs, setRs] = useState(() => defaultFormDateYmd());
  const [re, setRe] = useState("");
  const [recEdit, setRecEdit] = useState<RecRow | null>(null);
  const [ert, setErt] = useState("");
  const [era, setEra] = useState("");
  const [eit, setEit] = useState("salary");
  const [ePay, setEpay] = useState("5");
  const [ef, setEf] = useState<"monthly" | "weekly">("monthly");
  const [es, setEs] = useState("");
  const [ee, setEe] = useState("");

  const openRecEdit = (r: RecRow) => {
    setRecEdit(r);
    setErt(r.title);
    setEra(String(r.amount));
    setEit(r.incomeType || "salary");
    setEpay(String(r.payDayOfMonth ?? 5));
    setEf(r.frequency);
    setEs(toLocalYmd(new Date(r.startDate)));
    setEe(r.endDate ? toLocalYmd(new Date(r.endDate)) : "");
  };

  const del = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      invalidateIncomes();
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
    onMutate: () => {
      const toastId = toast.loading(tC("savingChanges"));
      return { toastId };
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx?.toastId) {
        toast.success(tC("updated"), { id: ctx.toastId });
      } else {
        toast.success(tC("updated"));
      }
      setEdit(null);
      invalidateIncomes();
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.toastId) {
        toast.error(e.message, { id: ctx.toastId });
      } else {
        toast.error(e.message);
      }
    },
  });
  const createRecurring = useMutation({
    mutationFn: () =>
      jsonFetch("/api/recurring-incomes", {
        method: "POST",
        body: JSON.stringify({
          title: rt,
          amount: Number(ra),
          frequency: rf,
          incomeType: rIncomeType,
          payDayOfMonth: rf === "monthly" ? Math.min(30, Math.max(1, Math.round(parseFloat(rPay)) || 5)) : undefined,
          startDate: new Date(rs).toISOString(),
          endDate: re.trim() ? new Date(re).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("recurringSaved"));
      setRt("");
      setRa("");
      setRIncomeType("salary");
      setRPay(String(Math.min(30, Math.max(1, new Date().getDate()))));
      setRf("monthly");
      setRs(defaultFormDateYmd());
      setRe("");
      invalidateIncomes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRecurring = useMutation({
    mutationFn: () => {
      if (!recEdit) return Promise.reject();
      return jsonFetch(`/api/recurring-incomes/${recEdit._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: ert,
          amount: parseFloat(era),
          frequency: ef,
          incomeType: eit,
          payDayOfMonth: ef === "monthly" ? Math.min(30, Math.max(1, Math.round(parseFloat(ePay)) || 5)) : undefined,
          startDate: new Date(es).toISOString(),
          endDate: ee.trim() ? new Date(ee).toISOString() : null,
        }),
      });
    },
    onMutate: () => {
      const toastId = toast.loading(tC("savingChanges"));
      return { toastId };
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx?.toastId) toast.success(tC("updated"), { id: ctx.toastId });
      else toast.success(tC("updated"));
      setRecEdit(null);
      invalidateIncomes();
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.toastId) toast.error(e.message, { id: ctx.toastId });
      else toast.error(e.message);
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/recurring-incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      invalidateIncomes();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const typeLabel = (v: string) =>
    v === "salary" || v === "freelance" || v === "gam3eya" || v === "other" ? t(`types.${v}`) : v;

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescAll")}
        action={
          <Link className={cn(buttonVariants())} href="/income/new">
            {t("add")}
          </Link>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("totalIncome")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{formatMoney(S?.totalIncome ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            All-time inflow
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("totalSalary")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{formatMoney(sat)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Salary only
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("totalExpenses")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-rose-600 dark:text-rose-400">
              {formatMoney(S?.totalExpenses ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <BanknoteArrowDown className="size-3.5" />
            All-time spending
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("netAll")}</CardDescription>
            <CardTitle
              className={cn(
                "font-mono text-2xl tabular-nums",
                (S?.netBalance ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatMoney(S?.netBalance ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <Scale className="size-3.5" />
            Balance from start
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("lifetimeTitle")}</CardTitle>
          <CardDescription>{t("lifetimeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerLoading || !S ? (
            <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 min-[800px]:grid-cols-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[500px]:grid-cols-2 min-[800px]:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <p className="text-xs text-muted-foreground">{t("totalIncome")}</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(S.totalIncome)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <p className="text-xs text-muted-foreground">{t("totalSalary")}</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(sat)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <p className="text-xs text-muted-foreground">{t("totalExpenses")}</p>
                <p className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatMoney(S.totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <p className="text-xs text-muted-foreground">{t("netAll")}</p>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    S.netBalance >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(S.netBalance)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3 min-[500px]:col-span-2 min-[800px]:col-span-1">
                <p className="text-xs text-muted-foreground">{t("netFromSalary")}</p>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    netFromSal >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {formatMoney(netFromSal)}
                </p>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">{t("lifetimeNetHint")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("lineTitle")}</CardTitle>
          <CardDescription>{t("lineDescAll")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton
              columnShapes={["sm", "fill", "xs", "end", "end"]}
              rows={6}
            />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRowsAll")}</p>
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
                            setD(toLocalYmd(new Date(r.date)));
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
              {rows.length > 0 && (
                <PaginatedListFooter
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={() => void fetchNextPage()}
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
          <CardTitle>{t("recurringSectionTitle")}</CardTitle>
          <CardDescription>{t("recurringSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground sm:text-sm">{t("recurringPayDayHelp")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              className="h-11"
              placeholder={tC("title")}
              value={rt}
              onChange={(e) => setRt(e.target.value)}
            />
            <Input
              className="h-11"
              type="number"
              step="0.01"
              placeholder={tC("amount")}
              value={ra}
              onChange={(e) => setRa(e.target.value)}
            />
            <div className="space-y-1">
              <Label className="text-xs">{t("recurringType")}</Label>
              <Select
                value={rIncomeType}
                onValueChange={(v) => v != null && setRIncomeType(v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">{t("types.salary")}</SelectItem>
                  <SelectItem value="freelance">{t("types.freelance")}</SelectItem>
                  <SelectItem value="gam3eya">{t("types.gam3eya")}</SelectItem>
                  <SelectItem value="other">{t("types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rf === "monthly" ? (
              <div className="space-y-1">
                <Label className="text-xs">{t("recurringPayDay")}</Label>
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={30}
                  value={rPay}
                  onChange={(e) => setRPay(e.target.value)}
                />
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            <div className="space-y-1">
              <Label className="text-xs">{t("recurringFrom")}</Label>
              <Input
                className="h-11"
                type="date"
                value={rs}
                onChange={(e) => setRs(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("recurringEnd")}</Label>
              <Input
                className="h-11"
                type="date"
                value={re}
                onChange={(e) => setRe(e.target.value)}
              />
            </div>
            <Select value={rf} onValueChange={(v) => v && setRf(v as "monthly" | "weekly")}>
              <SelectTrigger className="h-11 sm:col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t("freqMonthly")}</SelectItem>
                <SelectItem value="weekly">{t("freqWeekly")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="h-11 w-full min-[500px]:w-auto"
              onClick={() => createRecurring.mutate()}
              disabled={!rt || !ra || createRecurring.isPending}
            >
              {t("addRecurringTemplate")}
            </Button>
          </div>
          {recurringRows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tC("title")}</TableHead>
                    <TableHead className="hidden min-[400px]:table-cell">{t("recurringType")}</TableHead>
                    <TableHead className="hidden min-[500px]:table-cell whitespace-nowrap">
                      {t("recurringTableFrom")}
                    </TableHead>
                    <TableHead className="hidden min-[500px]:table-cell whitespace-nowrap">
                      {t("recurringTableTo")}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap text-center text-xs">
                      {t("recurringTablePayDay")}
                    </TableHead>
                    <TableHead className="text-end">{tC("amount")}</TableHead>
                    <TableHead className="w-28 text-end">{tC("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringRows.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-[0.7rem] text-muted-foreground sm:hidden">
                          {r.frequency === "monthly" ? t("freqMonthly") : t("freqWeekly")} ·{" "}
                          {typeLabel(r.incomeType || "salary")}
                        </div>
                      </TableCell>
                      <TableCell className="hidden min-[400px]:table-cell text-sm">
                        {typeLabel(r.incomeType || "salary")}
                      </TableCell>
                      <TableCell className="hidden min-[500px]:table-cell text-sm text-muted-foreground">
                        {formatDateMedium(new Date(r.startDate), locale)}
                      </TableCell>
                      <TableCell className="hidden min-[500px]:table-cell text-sm text-muted-foreground">
                        {r.endDate ? formatDateMedium(new Date(r.endDate), locale) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-sm">
                        {r.frequency === "monthly" ? r.payDayOfMonth ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-end tabular-nums text-sm">
                        {formatMoney(r.amount)}
                        <div className="text-[0.65rem] text-muted-foreground sm:hidden">
                          {r.frequency === "monthly" ? t("freqMonthly") : t("freqWeekly")}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openRecEdit(r)}
                        >
                          {tC("edit")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(t("deleteRecurringQ"))) {
                              deleteRecurring.mutate(r._id);
                            }
                          }}
                        >
                          {tC("delete")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginatedListFooter
                hasNextPage={!!hasNextRecurring}
                isFetchingNextPage={isFetchingRecurring}
                onLoadMore={() => void fetchNextRecurring()}
                labelLoadMore={tC("loadMore")}
                labelLoading={tC("loadingMore")}
                labelEnd={tC("endOfList")}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={!!recEdit}
        onOpenChange={() => {
          setRecEdit(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editRecurring")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{tC("title")}</Label>
              <Input value={ert} onChange={(e) => setErt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tC("amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={era}
                onChange={(e) => setEra(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("recurringType")}</Label>
              <Select value={eit} onValueChange={(v) => v != null && setEit(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">{t("types.salary")}</SelectItem>
                  <SelectItem value="freelance">{t("types.freelance")}</SelectItem>
                  <SelectItem value="gam3eya">{t("types.gam3eya")}</SelectItem>
                  <SelectItem value="other">{t("types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ef === "monthly" ? (
              <div className="flex flex-col gap-2">
                <Label>{t("recurringPayDay")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={ePay}
                  onChange={(e) => setEpay(e.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{t("recurringFrom")}</Label>
                <Input type="date" value={es} onChange={(e) => setEs(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("recurringEnd")}</Label>
                <Input type="date" value={ee} onChange={(e) => setEe(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("recurringSchedule")}</Label>
              <Select value={ef} onValueChange={(v) => v && setEf(v as "monthly" | "weekly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("freqMonthly")}</SelectItem>
                  <SelectItem value="weekly">{t("freqWeekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecEdit(null)}
              disabled={updateRecurring.isPending}
            >
              {tC("close")}
            </Button>
            <Button
              onClick={() => updateRecurring.mutate()}
              disabled={updateRecurring.isPending}
            >
              {updateRecurring.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {tC("saving")}
                </>
              ) : (
                tC("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>{tC("title")}</Label>
              <Input value={tx} onChange={(e) => setTx(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tC("amount")}</Label>
              <Input
                type="number"
                step="0.01"
                value={a}
                onChange={(e) => setA(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tC("date")}</Label>
              <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{tC("type")}</Label>
              <Select value={ty} onValueChange={(v) => v && setTy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">{t("types.salary")}</SelectItem>
                  <SelectItem value="freelance">{t("types.freelance")}</SelectItem>
                  <SelectItem value="gam3eya">{t("types.gam3eya")}</SelectItem>
                  <SelectItem value="other">{t("types.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={update.isPending}>
              {tC("close")}
            </Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {tC("saving")}
                </>
              ) : (
                tC("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
