import { endOfMonth } from "date-fns";

const TZ =
  (typeof process !== "undefined" && process.env.RECURRING_DUE_TIMEZONE) || "Africa/Cairo";

/**
 * Calendar Y/M/D in a given IANA time zone (for due-day matching with daily cron).
 */
export function getYMDInTimeZone(d: Date, timeZone: string = TZ) {
  const s = d.toLocaleString("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, d: day };
}

export function getRecurringDueTimezone() {
  return TZ;
}

/** User-chosen day 1–30; 31 is not allowed. */
export function parseDueDayOfMonth(input: unknown): { ok: true; value: number } | { ok: false; error: string } {
  if (input == null || input === "") return { ok: true, value: 0 };
  const n = Math.round(Number(input));
  if (!Number.isFinite(n) || n < 1 || n > 30) {
    return { ok: false, error: "Due day must be between 1 and 30" };
  }
  return { ok: true, value: n };
}

/** If due is 30 and month has 28/29/30 days, use last day. */
export function effectiveDueDayInMonth(due1to30: number, year: number, month1to12: number) {
  const end = endOfMonth(new Date(year, month1to12 - 1, 1));
  const last = end.getDate();
  return Math.min(due1to30, last);
}

/** Default from validFrom when not stored (1–30). */
export function defaultDueDayFromValidFrom(validFrom: Date) {
  const day = validFrom.getUTCDate();
  return Math.min(30, Math.max(1, day));
}

/**
 * Next calendar day (y, m, d) with 1–12 months (Gregorian, same as `getYMDInTimeZone`).
 */
export function addOneCivilDay(y: number, m: number, d: number) {
  const last = new Date(y, m, 0).getDate();
  if (d < last) return { y, m, d: d + 1 };
  if (m < 12) return { y, m: m + 1, d: 1 };
  return { y: y + 1, m: 1, d: 1 };
}
