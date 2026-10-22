/**
 * Client-safe mirror of the monthly report JSON shape returned by
 * `GET /api/reports/monthly` (keeps the browser bundle free of server-only imports).
 */
import type { PaymentMethod } from "@/lib/payment-method";

export type MonthlyReportDto = {
  year: number;
  month: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    totalIncomeFromIncomes: number;
    projectIncome: number;
    /** In monthly reports: total `salary` lines in that month. In all-time ledger: cumulative salary only. */
    salaryIncome?: number;
    salaryIncomeAllTime?: number;
  };
  incomeByType: Record<string, number>;
  expenseByCategory: Record<string, number>;
  incomeLineItems: {
    _id: string;
    title: string;
    amount: number;
    date: string;
    incomeType: string;
    paymentMethod?: PaymentMethod;
  }[];
  projectLineItems: {
    _id: string;
    name: string;
    amount: number;
    date: string;
    note?: string;
    paymentMethod?: PaymentMethod;
  }[];
  expenseLineItems: {
    _id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
    source: "variable" | "recurring" | "fixed_once";
    /** Spend linked to a project name (optional). */
    projectName?: string;
    paymentMethod?: PaymentMethod;
  }[];
  insights: {
    overspent: boolean;
    biggestExpenseCategory: { name: string; amount: number } | null;
    moneyLeft: number;
  };
  smartInsights?: SmartInsightDto[];
};

/** Short dashboard tips (i18n on client) — based on **salary** for the “what matters” row. */
export type SmartInsightDto =
  | { kind: "noSalary" }
  | { kind: "leftFromSalary"; left: number; expenses: number }
  | { kind: "overVsSalary"; over: number; expenses: number; salary: number }
  | { kind: "spendShareOfSalary"; pct: number }
  | { kind: "expensesUp"; pct: number }
  | { kind: "expensesDown"; pct: number }
  | { kind: "salaryVsPrev"; pct: number };
