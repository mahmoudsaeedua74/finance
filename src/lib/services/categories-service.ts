import { Category } from "@/lib/models";
import { INCOME_TYPES } from "@/lib/income-types";
import { EXPENSE_CATEGORY_PRESETS } from "@/lib/expense-categories";

export type CategoryDto = {
  id: string;
  name: string;
  type: "income" | "expense";
  isDefault: boolean;
};

export function normalizeCategoryName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function defaultsForType(type: "income" | "expense"): string[] {
  return type === "income"
    ? [...INCOME_TYPES]
    : [...EXPENSE_CATEGORY_PRESETS];
}

export async function listCategoriesForUser(
  userId: string,
  type: "income" | "expense"
): Promise<CategoryDto[]> {
  const custom = await Category.find({ userId, type }).sort({ name: 1 }).lean();
  const defaults = defaultsForType(type).map((name) => ({
    id: `default:${type}:${name}`,
    name,
    type,
    isDefault: true,
  }));
  const rows = custom.map((c) => ({
    id: String(c._id),
    name: c.name,
    type: c.type,
    isDefault: false,
  }));
  return [...defaults, ...rows];
}
