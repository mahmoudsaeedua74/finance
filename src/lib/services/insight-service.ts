import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Expense } from "@/lib/models";

export async function buildSmartInsights(userId: string, year: number, month: number) {
  const currentStart = startOfMonth(new Date(year, month - 1, 1));
  const currentEnd = endOfMonth(currentStart);
  const prevStart = startOfMonth(subMonths(currentStart, 1));
  const prevEnd = endOfMonth(prevStart);

  const [currRows, prevRows] = await Promise.all([
    Expense.find({ userId, isTemplate: false, date: { $gte: currentStart, $lte: currentEnd } }).lean(),
    Expense.find({ userId, isTemplate: false, date: { $gte: prevStart, $lte: prevEnd } }).lean(),
  ]);

  const byCategory = (rows: { category: string; amount: number }[]) => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.category, (map.get(r.category) || 0) + r.amount));
    return map;
  };

  const currentByCategory = byCategory(currRows);
  const prevByCategory = byCategory(prevRows);
  const insights: { key: string; message: string; severity: "info" | "warning" }[] = [];

  for (const [category, currentTotal] of Array.from(currentByCategory.entries())) {
    const prevTotal = prevByCategory.get(category) || 0;
    if (prevTotal <= 0) continue;
    const deltaPct = ((currentTotal - prevTotal) / prevTotal) * 100;
    if (Math.abs(deltaPct) >= 25) {
      const direction = deltaPct > 0 ? "more" : "less";
      insights.push({
        key: `${category}-${direction}`,
        message: `You spent ${Math.abs(deltaPct).toFixed(0)}% ${direction} on ${category} than last month.`,
        severity: deltaPct > 0 ? "warning" : "info",
      });
    }
  }

  return insights.slice(0, 5);
}
