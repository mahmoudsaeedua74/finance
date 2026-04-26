/**
 * Stable English slugs stored in Expense.category. Shown in UI via
 * `expense.categories.*` in messages.
 */
export const EXPENSE_CATEGORY_PRESETS = [
  "general",
  "food",
  "commute",
  "transport",
  "social",
  "shopping",
  "gam3eya",
  "network",
  "employee",
  "gym",
  "subscription",
] as const;

export type ExpenseCategoryPreset = (typeof EXPENSE_CATEGORY_PRESETS)[number];

/** Select value when the stored category is not one of the presets (free text). */
export const EXPENSE_CUSTOM_SELECT_VALUE = "__custom__" as const;

export function isPresetExpenseCategory(s: string): boolean {
  return (EXPENSE_CATEGORY_PRESETS as readonly string[]).includes(s);
}

/** Display: translate presets; keep legacy or custom text as stored. */
export function labelExpenseCategory(
  raw: string,
  t: (key: string) => string
): string {
  if (isPresetExpenseCategory(raw)) return t(raw);
  return raw;
}

export function resolveExpenseCategoryForSave(input: string): string {
  const t = input.trim();
  if (!t) return "general";
  return t;
}
