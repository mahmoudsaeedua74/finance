/**
 * `YYYY-MM-DD` in the environment's local calendar (for `<input type="date">`).
 * Do not use `toISOString().slice(0, 10)` for this — in positive-offset zones
 * it can shift the calendar day.
 */
export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
