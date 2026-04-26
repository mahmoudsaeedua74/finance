import { addDays } from "date-fns";
import type { Types } from "mongoose";
import { effectiveDueDayInMonth } from "@/lib/due-day-of-month";
import { templateAppliesInMonth } from "@/lib/monthly";
import { normalizeIncomeType } from "@/lib/income-types";
import { Income, RecurringIncomeTemplate } from "@/lib/models";
import type { RecurringIncomeFrequency } from "@/lib/models/RecurringIncomeTemplate";

/** @internal */
export function* iterateMonths(
  yStart: number,
  mStart: number,
  yEnd: number,
  mEnd: number
): Generator<{ y: number; m: number }> {
  let y = yStart;
  let m = mStart;
  for (;;) {
    if (y > yEnd || (y === yEnd && m > mEnd)) return;
    yield { y, m };
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

function shouldGenerateOnDate(
  d: Date,
  frequency: RecurringIncomeFrequency,
  start: Date
) {
  if (frequency === "weekly") {
    return d.getDay() === start.getDay();
  }
  return d.getDate() === start.getDate();
}

type LeanTemplate = {
  _id: Types.ObjectId;
  title: string;
  amount: number;
  frequency: RecurringIncomeFrequency;
  incomeType?: string;
  payDayOfMonth?: number;
  startDate: Date;
  endDate: Date | null;
  lastGeneratedAt: Date | null;
};

/**
 * For each active template, create missing {@link Income} rows up to `now` (inclusive of pay days).
 * Monthly: one line per (template, year, month) on `payDayOfMonth` (effective in that month); dedup with `recurringSourceId`.
 * Weekly: same weekday as `startDate`, from start through now.
 */
export async function materializeRecurringIncomes(userId: string, now = new Date()) {
  const templates = await RecurringIncomeTemplate.find({ userId, active: true }).lean() as unknown as LeanTemplate[];
  let created = 0;

  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;

  for (const t of templates) {
    const start = new Date(t.startDate);
    const endCap = t.endDate ? new Date(t.endDate) : now;
    const end = endCap.getTime() < now.getTime() ? endCap : now;
    const incomeType = normalizeIncomeType(t.incomeType);
    const payDom =
      t.payDayOfMonth != null && t.payDayOfMonth >= 1 && t.payDayOfMonth <= 30
        ? t.payDayOfMonth
        : Math.min(30, Math.max(1, start.getDate()));
    if (t.frequency === "monthly") {
      const yStart = start.getFullYear();
      const mStart = start.getMonth() + 1;
      const monthIt = iterateMonths(yStart, mStart, yNow, mNow);
      for (let next = monthIt.next(); !next.done; next = monthIt.next()) {
        const { y, m } = next.value;
        if (!templateAppliesInMonth(start, t.endDate, y, m)) continue;
        const day = effectiveDueDayInMonth(payDom, y, m);
        const d = new Date(y, m - 1, day, 12, 0, 0, 0);
        if (d.getTime() < start.getTime()) continue;
        if (d.getTime() > end.getTime()) break;
        const existing = await Income.findOne({
          userId,
          recurringSourceId: t._id,
          date: { $gte: new Date(y, m - 1, day, 0, 0, 0, 0), $lte: new Date(y, m - 1, day, 23, 59, 59, 999) },
        }).lean();
        if (existing) continue;
        await Income.create({
          userId,
          title: t.title,
          amount: t.amount,
          date: d,
          incomeType,
          recurringSourceId: t._id,
        });
        created += 1;
      }
    } else {
      const from = t.lastGeneratedAt ? addDays(new Date(t.lastGeneratedAt), 1) : start;
      const rangeEnd = end.getTime() < now.getTime() ? end : now;
      for (let d = new Date(from); d <= rangeEnd; d = addDays(d, 1)) {
        if (!shouldGenerateOnDate(d, t.frequency, start)) continue;
        const d0 = new Date(d);
        d0.setHours(12, 0, 0, 0);
        if (d0 < start) continue;
        if (d0.getTime() > end.getTime()) break;
        const existing = await Income.findOne({
          userId,
          recurringSourceId: t._id,
          date: { $gte: new Date(d0), $lt: addDays(d0, 1) },
        }).lean();
        if (existing) continue;
        await Income.create({
          userId,
          title: t.title,
          amount: t.amount,
          date: d0,
          incomeType,
          recurringSourceId: t._id,
        });
        created += 1;
      }
    }

    await RecurringIncomeTemplate.findByIdAndUpdate(t._id, { $set: { lastGeneratedAt: now } });
  }

  return { created };
}
