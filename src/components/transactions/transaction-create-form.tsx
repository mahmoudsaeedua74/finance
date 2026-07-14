"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Loader2, Repeat } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { defaultFormDateYmd } from "@/lib/ymd";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelectField } from "@/components/categories/category-select-field";
import { ExpenseCategoryField } from "@/components/expense/expense-category-field";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import { createExpense } from "@/features/expenses/api";
import { resolveExpenseCategoryForSave } from "@/lib/expense-categories";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { normalizeIncomeType } from "@/lib/income-types";
import type { PaymentMethod } from "@/lib/payment-method";
import { cn } from "@/lib/utils";

export type TxSchedule = "once" | "recurring";

const fieldClass = "h-11 rounded-xl";

function TransactionScheduleToggle({
  value,
  onChange,
}: {
  value: TxSchedule;
  onChange: (v: TxSchedule) => void;
}) {
  const t = useTranslations("transactions");

  const options: {
    id: TxSchedule;
    label: string;
    hint: string;
    icon: typeof CalendarClock;
  }[] = [
    {
      id: "once",
      label: t("scheduleOnce"),
      hint: t("scheduleOnceHint"),
      icon: CalendarClock,
    },
    {
      id: "recurring",
      label: t("scheduleRecurring"),
      hint: t("scheduleRecurringHint"),
      icon: Repeat,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("scheduleLabel")}>
      {options.map((opt) => {
        const selected = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex min-h-[4.5rem] flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-start transition-all",
              selected
                ? "border-primary/50 bg-primary/10 ring-2 ring-primary/25"
                : "border-border/70 bg-muted/15 hover:border-border hover:bg-muted/30"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon className="size-4 shrink-0 opacity-80" />
              {opt.label}
            </span>
            <span className="text-[11px] leading-snug text-muted-foreground">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TransactionIncomeCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const tInc = useTranslations("income");
  const tTx = useTranslations("transactions");
  const tC = useTranslations("common");
  const { invalidateIncomes } = useFinanceInvalidation();

  const [schedule, setSchedule] = useState<TxSchedule>("once");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => defaultFormDateYmd());
  const [category, setCategory] = useState("salary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("unspecified");
  const [payDay, setPayDay] = useState(() =>
    String(Math.min(30, Math.max(1, new Date().getDate())))
  );
  const [startDate, setStartDate] = useState(() => defaultFormDateYmd());
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setTitle("");
    setAmount("");
    setDate(defaultFormDateYmd());
    setCategory("salary");
    setPaymentMethod("unspecified");
    setPayDay(String(Math.min(30, Math.max(1, new Date().getDate()))));
    setStartDate(defaultFormDateYmd());
    setEndDate("");
  }, [schedule]);

  const save = useMutation({
    mutationFn: async () => {
      if (schedule === "once") {
        return jsonFetch("/api/incomes", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            amount: parseFloat(amount),
            date: new Date(date).toISOString(),
            incomeType: normalizeIncomeType(category),
            category,
            paymentMethod,
          }),
        });
      }
      return jsonFetch("/api/recurring-incomes", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          frequency: "monthly",
          incomeType: normalizeIncomeType(category),
          payDayOfMonth: Math.min(30, Math.max(1, Math.round(parseFloat(payDay)) || 5)),
          startDate: new Date(startDate).toISOString(),
          endDate: endDate.trim() ? new Date(endDate).toISOString() : null,
        }),
      });
    },
    onMutate: () => ({ toastId: toast.loading(tC("saving")) }),
    onSuccess: (_d, _v, ctx) => {
      toast.success(schedule === "once" ? tInc("saved") : tInc("recurringSaved"), {
        id: ctx?.toastId,
      });
      invalidateIncomes();
      onSuccess();
    },
    onError: (e: Error, _v, ctx) => {
      toast.error(e.message, { id: ctx?.toastId });
    },
  });

  const canSave = title.trim() && amount && !Number.isNaN(parseFloat(amount));

  return (
    <div className="space-y-4">
      <TransactionScheduleToggle value={schedule} onChange={setSchedule} />

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="txn-inc-title">{tC("title")}</Label>
          <Input
            id="txn-inc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tInc("phTitle")}
            className={fieldClass}
            autoFocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="txn-inc-amount">{tC("amount")}</Label>
            <Input
              id="txn-inc-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(fieldClass, "font-mono tabular-nums")}
            />
          </div>
          {schedule === "once" ? (
            <div className="space-y-2">
              <Label htmlFor="txn-inc-date">{tC("date")}</Label>
              <Input
                id="txn-inc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="txn-inc-payday">{tInc("recurringPayDay")}</Label>
              <Input
                id="txn-inc-payday"
                type="number"
                min={1}
                max={30}
                value={payDay}
                onChange={(e) => setPayDay(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>

        <CategorySelectField
          type="income"
          value={category}
          onChange={setCategory}
          label={tC("category")}
        />

        {schedule === "once" ? (
          <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} size="compact" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="txn-inc-start">{tInc("recurringFrom")}</Label>
              <Input
                id="txn-inc-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-inc-end">{tInc("recurringEnd")}</Label>
              <Input
                id="txn-inc-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        )}

        {schedule === "recurring" ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{tTx("recurringIncomeNote")}</p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
          {tC("cancel")}
        </Button>
        <Button
          type="button"
          className="rounded-xl"
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate(undefined)}
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
  );
}

export function TransactionExpenseCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const tExp = useTranslations("expense");
  const tTx = useTranslations("transactions");
  const tC = useTranslations("common");
  const { invalidateExpenses } = useFinanceInvalidation();

  const [schedule, setSchedule] = useState<TxSchedule>("once");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(() => defaultFormDateYmd());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("unspecified");
  const [from, setFrom] = useState(() => defaultFormDateYmd());
  const [to, setTo] = useState("");
  const [dueDay, setDueDay] = useState(() =>
    String(Math.min(30, Math.max(1, new Date().getDate())))
  );

  useEffect(() => {
    setTitle("");
    setAmount("");
    setCategory(schedule === "recurring" ? "subscription" : "general");
    setDate(defaultFormDateYmd());
    setPaymentMethod("unspecified");
    setFrom(defaultFormDateYmd());
    setTo("");
    setDueDay(String(Math.min(30, Math.max(1, new Date().getDate()))));
  }, [schedule]);

  const save = useMutation({
    mutationFn: async () => {
      const cat = resolveExpenseCategoryForSave(category);
      if (schedule === "once") {
        return createExpense({
          title: title.trim(),
          amount: parseFloat(amount),
          category: cat,
          date: new Date(date).toISOString(),
          paymentMethod,
          kind: "variable",
        });
      }
      return createExpense({
        title: title.trim(),
        amount: parseFloat(amount),
        category: cat,
        isTemplate: true,
        recurring: true,
        validFrom: new Date(from).toISOString(),
        validTo: to.trim() ? new Date(to).toISOString() : null,
        dueDayOfMonth: Math.min(30, Math.max(1, Math.round(parseFloat(dueDay)) || 10)),
        paymentMethod,
      });
    },
    onMutate: () => ({ toastId: toast.loading(tC("saving")) }),
    onSuccess: (_d, _v, ctx) => {
      toast.success(schedule === "once" ? tExp("savedV") : tExp("savedR"), { id: ctx?.toastId });
      invalidateExpenses({ includeAllList: true });
      onSuccess();
    },
    onError: (e: Error, _v, ctx) => {
      toast.error(e.message, { id: ctx?.toastId });
    },
  });

  const canSave = title.trim() && amount && !Number.isNaN(parseFloat(amount));

  return (
    <div className="space-y-4">
      <TransactionScheduleToggle value={schedule} onChange={setSchedule} />

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="txn-exp-title">{tC("title")}</Label>
          <Input
            id="txn-exp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={schedule === "once" ? tExp("varReasonPh") : tExp("phRecT")}
            className={fieldClass}
            autoFocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="txn-exp-amount">
              {schedule === "once" ? tC("amount") : tExp("formAmountPerMonth")}
            </Label>
            <Input
              id="txn-exp-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn(fieldClass, "font-mono tabular-nums")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="txn-exp-cat">{tC("category")}</Label>
            <ExpenseCategoryField
              id="txn-exp-cat"
              value={category}
              onCategoryChange={setCategory}
              className={fieldClass}
            />
          </div>
        </div>

        {schedule === "once" ? (
          <div className="space-y-2">
            <Label htmlFor="txn-exp-date">{tC("date")}</Label>
            <Input
              id="txn-exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="txn-exp-from">{tExp("table.from")}</Label>
              <Input
                id="txn-exp-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-exp-due">{tExp("dueDayOfMonth")}</Label>
              <Input
                id="txn-exp-due"
                type="number"
                min={1}
                max={30}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="txn-exp-to">{tExp("endOpt")}</Label>
              <Input
                id="txn-exp-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        )}

        <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} size="compact" />

        {schedule === "recurring" ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{tTx("recurringExpenseNote")}</p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
          {tC("cancel")}
        </Button>
        <Button
          type="button"
          className="rounded-xl"
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate(undefined)}
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
  );
}
