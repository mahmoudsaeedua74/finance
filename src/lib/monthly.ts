import {
  endOfMonth,
  isWithinInterval,
  startOfMonth,
} from "date-fns";

export function toYearMonthString(year: number, month1to12: number) {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

export function addCalendarMonths(year: number, month1to12: number, delta: number) {
  const d = new Date(year, month1to12 - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function parseYearMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

export function monthWindow(year: number, month1to12: number) {
  const start = startOfMonth(new Date(year, month1to12 - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export function isDateInMonth(
  d: Date,
  year: number,
  month1to12: number
): boolean {
  const { start, end } = monthWindow(year, month1to12);
  return isWithinInterval(d, { start, end });
}

/**
 * Recurring template applies to a month if the month overlaps [validFrom, validTo] (inclusive; validTo null = open-ended).
 */
export function templateAppliesInMonth(
  validFrom: Date,
  validTo: Date | null | undefined,
  year: number,
  month1to12: number
): boolean {
  const { start, end } = monthWindow(year, month1to12);
  if (validFrom.getTime() > end.getTime()) return false;
  if (validTo) {
    if (validTo.getTime() < start.getTime()) return false;
  }
  return true;
}

export type GroupedSums = Record<string, number>;

export function addToMap(map: GroupedSums, key: string, amount: number) {
  const k = key.trim() || "Other";
  map[k] = (map[k] || 0) + amount;
}

export function topEntry(map: GroupedSums): { key: string; value: number } | null {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  const [k, v] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { key: k, value: v };
}
