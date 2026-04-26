/**
 * Client-safe mirror of the monthly report JSON shape returned by
 * `GET /api/reports/monthly` (keeps the browser bundle free of server-only imports).
 */
export type MonthlyReportDto = {
  year: number;
  month: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    totalIncomeFromIncomes: number;
    projectIncome: number;
  };
  incomeByType: Record<string, number>;
  expenseByCategory: Record<string, number>;
  incomeLineItems: {
    _id: string;
    title: string;
    amount: number;
    date: string;
    incomeType: string;
  }[];
  projectLineItems: {
    _id: string;
    name: string;
    amount: number;
    date: string;
    note?: string;
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
  }[];
  insights: {
    overspent: boolean;
    biggestExpenseCategory: { name: string; amount: number } | null;
    moneyLeft: number;
  };
  budgetUsage?: {
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: "safe" | "warning" | "over";
  }[];
  smartInsights?: {
    key: string;
    message: string;
    severity: "info" | "warning";
  }[];
};
