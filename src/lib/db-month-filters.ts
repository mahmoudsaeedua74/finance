import { endOfMonth, startOfMonth } from "date-fns";

/**
 * Inclusive [mStart, mEnd] for a calendar month (local timezone via Date parts).
 * Used to scope Mongo `date` / `validFrom` / `validTo` queries without loading all rows.
 */
export function monthDateBoundsUTC(year: number, month1to12: number) {
  const mStart = startOfMonth(new Date(year, month1to12 - 1, 1));
  const mEnd = endOfMonth(mStart);
  return { mStart, mEnd };
}

/** One-off or variable rows whose `date` falls in the month. */
export function expenseNonTemplateInMonth(
  userId: string,
  mStart: Date,
  mEnd: Date,
) {
  return {
    userId,
    isTemplate: false as const,
    date: { $gte: mStart, $lte: mEnd },
  };
}

/**
 * Recurring templates that overlap the month window (same idea as
 * `templateAppliesInMonth` in `monthly.ts`, expressed as Mongo).
 */
export function expenseTemplatesApplyingInMonth(
  userId: string,
  mStart: Date,
  mEnd: Date,
) {
  return {
    userId,
    isTemplate: true as const,
    recurring: true as const,
    validFrom: { $lte: mEnd },
    $or: [{ validTo: null }, { validTo: { $gte: mStart } }],
  };
}

export function incomeInMonth(userId: string, mStart: Date, mEnd: Date) {
  return {
    userId,
    date: { $gte: mStart, $lte: mEnd },
  };
}

export function projectPayoutInMonth(userId: string, mStart: Date, mEnd: Date) {
  return {
    userId,
    date: { $gte: mStart, $lte: mEnd },
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  };
}

/** All collected payouts (any month) for ledger / wallet. */
export function projectCollectedFilter(userId: string) {
  return {
    userId,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  };
}
