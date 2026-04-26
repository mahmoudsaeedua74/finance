import { jsonFetch } from "@/lib/fetcher";
import type { PaginatedBody } from "@/lib/api/list-pagination";
import type {
  CreateRecurringTemplateInput,
  CreateVariableExpenseInput,
  ExpenseRow,
  UpdateExpenseInput,
} from "./types";

export type ExpenseListPage = PaginatedBody<ExpenseRow>;

export async function fetchExpensesByMonth(
  year: number,
  month: number,
  offset: number,
  limit: number
): Promise<ExpenseListPage> {
  return jsonFetch<ExpenseListPage>(
    `/api/expenses?year=${year}&month=${month}&offset=${offset}&limit=${limit}`
  );
}

export async function fetchExpenseTemplatesPage(
  offset: number,
  limit: number
): Promise<ExpenseListPage> {
  return jsonFetch<ExpenseListPage>(`/api/expenses?offset=${offset}&limit=${limit}`);
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
