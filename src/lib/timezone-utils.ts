/**
 * Hour (0–23, h23) and stable calendar day key `YYYY-MM-DD` in an IANA zone (e.g. Africa/Cairo).
 */
export function getHourAndDateKeyInZone(d: Date, timeZone: string): { hour: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const pick = (t: "year" | "month" | "day" | "hour") =>
    parts.find((p) => p.type === t)?.value ?? "";
  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  const hourStr = pick("hour");
  return {
    hour: Number.parseInt(hourStr || "0", 10),
    dateKey: `${year}-${month}-${day}`,
  };
}
