"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useMonth } from "@/context/month-context";
import { queryKeys } from "@/features/_lib/query-keys";
import { withMutationToasts, toastErrorOnly } from "@/features/_lib/mutation-toast";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { resolveExpenseCategoryForSave } from "@/lib/expense-categories";
import type { ExpenseRow, UpdateExpenseInput } from "./types";
import {
  createExpense,
  deleteExpense,
  fetchAllExpensesForTemplates,
  fetchExpensesByMonth,
  updateExpense,
} from "./api";
import type { CreateRecurringTemplateInput, CreateVariableExpenseInput } from "./types";

export function useExpensesForMonth() {
  const { year, month } = useMonth();
  return useQuery({
    queryKey: queryKeys.expenses.month(year, month),
    queryFn: () => fetchExpensesByMonth(year, month),
  });
}

export function useExpenseTemplatesList() {
  return useQuery({
    queryKey: queryKeys.expenses.all(),
    queryFn: () => fetchAllExpensesForTemplates(),
  });
}

export type EditPayload = {
  row: ExpenseRow;
  values: {
    title: string;
    amount: number;
    category: string;
    date: string;
    validFrom: string;
    validTo: string;
    projectName: string;
  };
};

function buildUpdateBody(
  row: ExpenseRow,
  v: EditPayload["values"]
): UpdateExpenseInput {
  if (row.isTemplate) {
    return {
      title: v.title,
      amount: v.amount,
      category: resolveExpenseCategoryForSave(v.category),
      validFrom: new Date(v.validFrom).toISOString(),
      validTo: v.validTo ? new Date(v.validTo).toISOString() : null,
      recurring: true,
      isTemplate: true,
      kind: "fixed",
      projectName: v.projectName,
    };
  }
  return {
    title: v.title,
    amount: v.amount,
    category: resolveExpenseCategoryForSave(v.category),
    date: new Date(v.date).toISOString(),
    kind: row.rowKind === "variable" ? "variable" : "fixed",
    projectName: v.projectName,
  };
}

export function useUpdateExpense(onDone: () => void) {
  const tC = useTranslations("common");
  const toasts = withMutationToasts({
    loading: tC("savingChanges"),
    success: tC("updated"),
  });
  const { invalidateExpenses } = useFinanceInvalidation();
  return useMutation({
    mutationFn: (payload: EditPayload) =>
      updateExpense(payload.row._id, buildUpdateBody(payload.row, payload.values)),
    onMutate: toasts.onMutate,
    onSuccess: (data, variables, context) => {
      toasts.onSuccess(data, variables, context);
      invalidateExpenses({ includeAllList: true });
      onDone();
    },
    onError: toasts.onError,
  });
}

export function useDeleteExpense() {
  const tC = useTranslations("common");
  const { invalidateExpenses } = useFinanceInvalidation();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success(tC("deleted"));
      invalidateExpenses({ includeAllList: true });
    },
    onError: (e: Error) => toastErrorOnly(e),
  });
}

/** Pass translated strings for each tab from the page. */
export function useCreateExpenseFormMutations(opts: {
  onDone: () => void;
  tSaved: { v: string; f: string; r: string };
}) {
  const tC = useTranslations("common");
  const { onDone, tSaved } = opts;
  const { invalidateExpenses } = useFinanceInvalidation();
  const invAll = { includeAllList: true as const };
  const toastsV = withMutationToasts({ loading: tC("saving"), success: tSaved.v });
  const toastsF = withMutationToasts({ loading: tC("saving"), success: tSaved.f });
  const toastsR = withMutationToasts({ loading: tC("saving"), success: tSaved.r });
  return {
    mVar: useMutation({
      mutationFn: (input: CreateVariableExpenseInput) =>
        createExpense({ ...input, kind: "variable" }),
      onMutate: toastsV.onMutate,
      onSuccess: (d, v, c) => {
        toastsV.onSuccess(d, v, c);
        invalidateExpenses();
        onDone();
      },
      onError: toastsV.onError,
    }),
    mFix: useMutation({
      mutationFn: (input: CreateVariableExpenseInput) =>
        createExpense({ ...input, kind: "fixed" }),
      onMutate: toastsF.onMutate,
      onSuccess: (d, v, c) => {
        toastsF.onSuccess(d, v, c);
        invalidateExpenses(invAll);
        onDone();
      },
      onError: toastsF.onError,
    }),
    mRec: useMutation({
      mutationFn: (input: CreateRecurringTemplateInput) => createExpense(input),
      onMutate: toastsR.onMutate,
      onSuccess: (d, v, c) => {
        toastsR.onSuccess(d, v, c);
        invalidateExpenses(invAll);
        onDone();
      },
      onError: toastsR.onError,
    }),
  };
}

export type { ExpenseRow } from "./types";
