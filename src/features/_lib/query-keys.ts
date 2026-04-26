/**
 * Central React Query keys — use everywhere (hooks + invalidation) to avoid drift.
 */
export const queryKeys = {
  report: (year: number, month: number) => ["report", year, month] as const,

  expenses: {
    month: (year: number, month: number) => ["expenses", year, month] as const,
    all: () => ["expenses", "all"] as const,
  },

  incomes: {
    month: (year: number, month: number) => ["incomes", year, month] as const,
    all: () => ["incomes"] as const,
  },
  recurringIncomes: () => ["recurring-incomes"] as const,

  projects: {
    month: (year: number, month: number) => ["projects", year, month] as const,
    all: () => ["projects", "all"] as const,
    allForSpend: () => ["projects", "all-for-spend"] as const,
  },

  notificationPreferences: () => ["notification-preferences"] as const,
  notifications: { root: () => ["notifications"] as const, unread: () => ["notifications", "unread"] as const },

  monthCompare: (cy: number, cm: number, py: number, pm: number) =>
    ["report-compare", cy, cm, py, pm] as const,
  forecast: (year: number, month: number) => ["forecast", year, month] as const,
  budgetUsage: (year: number, month: number) => ["budgets-usage", year, month] as const,
  goals: () => ["goals"] as const,
} as const;
