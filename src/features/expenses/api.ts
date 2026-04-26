import { jsonFetch } from "@/lib/fetcher";
import type {
  CreateRecurringTemplateInput,
  CreateVariableExpenseInput,
  ExpenseRow,
  UpdateExpenseInput,
} from "./types";

export type ExpenseListResponse = { data: ExpenseRow[] };

export async function fetchExpensesByMonth(
  year: number,
  month: number
): Promise<ExpenseListResponse> {
  return jsonFetch<ExpenseListResponse>(`/api/expenses?year=${year}&month=${month}`);
}

export async function fetchAllExpensesForTemplates(): Promise<ExpenseListResponse> {
  return jsonFetch<ExpenseListResponse>("/api/expenses");
}

export async function createExpense(
  body:
    | (CreateVariableExpenseInput & { kind: "variable" | "fixed" })
    | CreateRecurringTemplateInput
) {
  return jsonFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateExpense(id: string, body: UpdateExpenseInput) {
  return jsonFetch(`/api/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteExpense(id: string) {
  return jsonFetch(`/api/expenses/${id}`, { method: "DELETE" });
}
