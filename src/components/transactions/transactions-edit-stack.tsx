"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { jsonFetch } from "@/lib/fetcher";
import { toLocalYmd, defaultFormDateYmd } from "@/lib/ymd";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ExpenseEditForm } from "@/components/expense/expense-edit-form";
import { CategorySelectField } from "@/components/categories/category-select-field";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import {
  TransactionExpenseCreateForm,
  TransactionIncomeCreateForm,
} from "@/components/transactions/transaction-create-form";
import type { ExpenseRow } from "@/features/expenses/types";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { normalizeIncomeType } from "@/lib/income-types";
import type { PaymentMethod } from "@/lib/payment-method";
import { Loader2 } from "lucide-react";

export type RecIncomeFull = {
  _id: string;
  title: string;
  amount: number;
  frequency: "monthly" | "weekly";
  startDate: string;
  incomeType?: string;
  payDayOfMonth?: number;
  endDate?: string | null;
};

export type TxEditOpen =
  | { kind: "income"; mode: "create" }
  | { kind: "income"; mode?: "edit"; mongoId: string }
  | { kind: "expense"; mode: "create" }
  | { kind: "expense"; mode?: "edit"; mongoId: string }
  | { kind: "recIncome"; mode?: "edit"; raw: RecIncomeFull }
  | null;

function expenseDocToExpenseRow(d: {
  _id: string;
  title: string;
  amount: number;
  date: string | Date;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom?: string | Date;
  validTo?: string | Date | null;
  dueDayOfMonth?: number;
  projectName?: string;
}): ExpenseRow {
  const isTemplate = Boolean(d.isTemplate);
  const recurring = Boolean(d.recurring);
  const rowKind: ExpenseRow["rowKind"] =
    isTemplate && recurring ? "recurring" : d.kind === "fixed" ? "fixed_once" : "variable";
  const dateIso = typeof d.date === "string" ? d.date : new Date(d.date).toISOString();
  return {
    _id: String(d._id),
    title: d.title,
    amount: d.amount,
    date: dateIso,
    category: d.category,
    kind: d.kind,
    recurring,
    isTemplate,
    validFrom:
      d.validFrom != null
        ? typeof d.validFrom === "string"
          ? d.validFrom
          : new Date(d.validFrom).toISOString()
        : undefined,
    validTo:
      d.validTo != null
        ? typeof d.validTo === "string"
          ? d.validTo
          : new Date(d.validTo).toISOString()
        : null,
    dueDayOfMonth: d.dueDayOfMonth,
    rowKind,
    projectName: d.projectName?.trim() ?? "",
  };
}

type IncomeDoc = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  incomeType: string;
};

function IncomeFormBody({
  title,
  setTitle,
  amount,
  setAmount,
  date,
  setDate,
  incomeType,
  setIncomeType,
  paymentMethod,
  setPaymentMethod,
  incomeCategory,
  setIncomeCategory,
}: {
  title: string;
  setTitle: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  incomeType: string;
  setIncomeType: (v: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  incomeCategory: string;
  setIncomeCategory: (v: string) => void;
}) {
  const tInc = useTranslations("income");
  const tC = useTranslations("common");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="txn-income-title">{tC("title")}</Label>
        <Input
          id="txn-income-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tInc("phTitle")}
          className="h-11 rounded-xl"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="txn-income-amount">{tC("amount")}</Label>
          <Input
            id="txn-income-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 rounded-xl font-mono tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="txn-income-date">{tC("date")}</Label>
          <Input
            id="txn-income-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      <CategorySelectField
        type="income"
        value={incomeCategory}
        onChange={(v) => {
          setIncomeCategory(v);
          setIncomeType(normalizeIncomeType(v));
        }}
        label={tC("category")}
      />
      <PaymentMethodField value={paymentMethod} onChange={setPaymentMethod} size="compact" />
    </div>
  );
}

export function TransactionsEditDialogs({
  edit,
  onClose,
}: {
  edit: TxEditOpen;
  onClose: () => void;
}) {
  const tInc = useTranslations("income");
  const tExp = useTranslations("expense");
  const tTx = useTranslations("transactions");
  const tC = useTranslations("common");
  const { invalidateIncomes, invalidateExpenses } = useFinanceInvalidation();

  const isIncomeCreate = edit?.kind === "income" && edit.mode === "create";
  const isIncomeEdit = edit?.kind === "income" && edit.mode !== "create";
  const incomeId = isIncomeEdit ? edit.mongoId : null;

  const isExpenseCreate = edit?.kind === "expense" && edit.mode === "create";
  const isExpenseEdit = edit?.kind === "expense" && edit.mode !== "create";
  const expenseId = isExpenseEdit ? edit.mongoId : null;

  const incomeQ = useQuery({
    queryKey: ["txn-edit-income", incomeId],
    queryFn: () => jsonFetch<{ data: IncomeDoc }>(`/api/incomes/${incomeId}`),
    enabled: !!incomeId,
  });

  const expenseQ = useQuery({
    queryKey: ["txn-edit-expense", expenseId],
    queryFn: async () => {
      const res = await jsonFetch<{ data: Parameters<typeof expenseDocToExpenseRow>[0] }>(
        `/api/expenses/${expenseId}`
      );
      return expenseDocToExpenseRow(res.data);
    },
    enabled: !!expenseId,
  });

  const [tx, setTx] = useState("");
  const [a, setA] = useState("");
  const [d, setD] = useState(() => defaultFormDateYmd());
  const [ty, setTy] = useState("other");
  const [incomeCategory, setIncomeCategory] = useState("salary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("unspecified");

  useEffect(() => {
    const doc = incomeQ.data?.data;
    if (!doc || !isIncomeEdit) return;
    setTx(doc.title);
    setA(String(doc.amount));
    setD(toLocalYmd(new Date(doc.date)));
    setTy(doc.incomeType || "other");
    setIncomeCategory(doc.incomeType || "other");
  }, [incomeQ.data?.data, isIncomeEdit]);

  const updateIncome = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      amount: number;
      date: string;
      incomeType: string;
    }) =>
      jsonFetch(`/api/incomes/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: payload.title,
          amount: payload.amount,
          date: new Date(payload.date).toISOString(),
          incomeType: payload.incomeType,
        }),
      }),
    onMutate: () => ({ toastId: toast.loading(tC("savingChanges")) }),
    onSuccess: (_d, _v, ctx) => {
      toast.success(tC("updated"), { id: ctx?.toastId });
      invalidateIncomes();
      onClose();
    },
    onError: (e: Error, _v, ctx) => {
      toast.error(e.message, { id: ctx?.toastId });
    },
  });

  const [ert, setErt] = useState("");
  const [era, setEra] = useState("");
  const [eit, setEit] = useState("salary");
  const [ePay, setEpay] = useState("5");
  const [ef, setEf] = useState<"monthly" | "weekly">("monthly");
  const [es, setEs] = useState("");
  const [ee, setEe] = useState("");

  useEffect(() => {
    const r = edit?.kind === "recIncome" ? edit.raw : null;
    if (!r) return;
    setErt(r.title);
    setEra(String(r.amount));
    setEit(r.incomeType || "salary");
    setEpay(String(r.payDayOfMonth ?? 5));
    setEf(r.frequency);
    setEs(toLocalYmd(new Date(r.startDate)));
    setEe(r.endDate ? toLocalYmd(new Date(r.endDate)) : "");
  }, [edit]);

  const updateRecurringIncome = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      amount: number;
      frequency: "monthly" | "weekly";
      incomeType: string;
      payDayOfMonth?: number;
      startDate: string;
      endDate: string | null;
    }) =>
      jsonFetch(`/api/recurring-incomes/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: payload.title,
          amount: payload.amount,
          frequency: payload.frequency,
          incomeType: payload.incomeType,
          payDayOfMonth: payload.payDayOfMonth,
          startDate: new Date(payload.startDate).toISOString(),
          endDate: payload.endDate ? new Date(payload.endDate).toISOString() : null,
        }),
      }),
    onMutate: () => ({ toastId: toast.loading(tC("savingChanges")) }),
    onSuccess: (_d, _v, ctx) => {
      toast.success(tC("updated"), { id: ctx?.toastId });
      invalidateIncomes();
      onClose();
    },
    onError: (e: Error, _v, ctx) => {
      toast.error(e.message, { id: ctx?.toastId });
    },
  });

  const openRec = edit?.kind === "recIncome";

  const handleExpenseDone = () => {
    invalidateExpenses({ includeAllList: true });
    onClose();
  };

  return (
    <>
      <Dialog open={isIncomeCreate || isIncomeEdit} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isIncomeCreate ? tTx("addIncome") : tInc("editTitle")}</DialogTitle>
            {isIncomeCreate ? (
              <DialogDescription>{tTx("createIncomeDesc")}</DialogDescription>
            ) : null}
          </DialogHeader>
          {isIncomeCreate ? (
            <TransactionIncomeCreateForm onSuccess={onClose} onCancel={onClose} />
          ) : isIncomeEdit && incomeQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : isIncomeEdit && incomeQ.isError ? (
            <p className="text-sm text-destructive">{(incomeQ.error as Error).message}</p>
          ) : isIncomeEdit && incomeId ? (
            <>
              <IncomeFormBody
                title={tx}
                setTitle={setTx}
                amount={a}
                setAmount={setA}
                date={d}
                setDate={setD}
                incomeType={ty}
                setIncomeType={setTy}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                incomeCategory={incomeCategory}
                setIncomeCategory={setIncomeCategory}
              />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
                  {tC("cancel")}
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={
                    updateIncome.isPending ||
                    !tx.trim() ||
                    !a ||
                    Number.isNaN(parseFloat(a))
                  }
                  onClick={() => {
                    if (!incomeId) return;
                    updateIncome.mutate({
                      id: incomeId,
                      title: tx.trim(),
                      amount: parseFloat(a),
                      date: d,
                      incomeType: ty,
                    });
                  }}
                >
                  {updateIncome.isPending ? (
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
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseCreate || isExpenseEdit} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{isExpenseCreate ? tTx("addExpense") : tExp("editTitle")}</DialogTitle>
            {isExpenseCreate ? (
              <DialogDescription>{tTx("createExpenseDesc")}</DialogDescription>
            ) : null}
          </DialogHeader>
          {isExpenseCreate ? (
            <TransactionExpenseCreateForm onSuccess={handleExpenseDone} onCancel={onClose} />
          ) : expenseQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : expenseQ.isError ? (
            <p className="text-sm text-destructive">{(expenseQ.error as Error).message}</p>
          ) : expenseQ.data ? (
            <ExpenseEditForm
              key={expenseQ.data._id + String(expenseQ.data.isTemplate)}
              row={expenseQ.data}
              onDone={handleExpenseDone}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openRec} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{tInc("editRecurring")}</DialogTitle>
          </DialogHeader>
          {edit?.kind === "recIncome" ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label>{tC("title")}</Label>
                  <Input value={ert} onChange={(e) => setErt(e.target.value)} className="rounded-xl" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{tC("amount")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{tInc("recurringType")}</Label>
                  <Select value={eit} onValueChange={(v) => v != null && setEit(v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">{tInc("types.salary")}</SelectItem>
                      <SelectItem value="freelance">{tInc("types.freelance")}</SelectItem>
                      <SelectItem value="gam3eya">{tInc("types.gam3eya")}</SelectItem>
                      <SelectItem value="other">{tInc("types.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ef === "monthly" ? (
                  <div className="flex flex-col gap-2">
                    <Label>{tInc("recurringPayDay")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={ePay}
                      onChange={(e) => setEpay(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>{tInc("recurringFrom")}</Label>
                    <Input
                      type="date"
                      value={es}
                      onChange={(e) => setEs(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{tInc("recurringEnd")}</Label>
                    <Input
                      type="date"
                      value={ee}
                      onChange={(e) => setEe(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{tInc("recurringSchedule")}</Label>
                  <Select value={ef} onValueChange={(v) => v && setEf(v as "monthly" | "weekly")}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{tInc("freqMonthly")}</SelectItem>
                      <SelectItem value="weekly">{tInc("freqWeekly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
                  {tC("close")}
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={updateRecurringIncome.isPending}
                  onClick={() =>
                    updateRecurringIncome.mutate({
                      id: edit.raw._id,
                      title: ert,
                      amount: parseFloat(era),
                      frequency: ef,
                      incomeType: eit,
                      payDayOfMonth:
                        ef === "monthly"
                          ? Math.min(30, Math.max(1, Math.round(parseFloat(ePay)) || 5))
                          : undefined,
                      startDate: es,
                      endDate: ee.trim() ? ee : null,
                    })
                  }
                >
                  {updateRecurringIncome.isPending ? (
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
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
