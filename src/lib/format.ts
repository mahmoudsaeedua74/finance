import { ar, enUS } from "date-fns/locale";
import { format as dformat } from "date-fns";

function dfLocale(code: string) {
  return code === "ar" ? ar : enUS;
}

/** Default display currency is EGP (app bookkeeping base). */
export function formatMoney(n: number, currency = "EGP") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function monthLabel(
  year: number,
  month1to12: number,
  localeCode = "en"
) {
  return dformat(new Date(year, month1to12 - 1, 1), "LLLL yyyy", {
    locale: dfLocale(localeCode),
  });
}

/** Compact label for the mobile header (e.g. "Apr 2026"). */
export function shortMonthLabel(
  year: number,
  month1to12: number,
  localeCode = "en"
) {
  return dformat(new Date(year, month1to12 - 1, 1), "MMM yyyy", {
    locale: dfLocale(localeCode),
  });
}

export function formatDateLong(d: Date, localeCode = "en") {
  return dformat(d, "PP", { locale: dfLocale(localeCode) });
}

export function formatDateMedium(d: Date, localeCode = "en") {
  return dformat(d, "MMM d, yyyy", { locale: dfLocale(localeCode) });
}

export function formatDateTime(d: Date, localeCode = "en") {
  return dformat(d, "PPp", { locale: dfLocale(localeCode) });
}
