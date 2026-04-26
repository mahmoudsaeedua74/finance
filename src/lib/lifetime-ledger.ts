import { templateAppliesInMonth } from "./monthly";

type TemplateLike = {
  amount: number;
  validFrom: Date;
  validTo: Date | null | undefined;
};

/**
 * Sum of (amount × one per calendar month) from validFrom through `asOf` where
 * the template still applies, matching `templateAppliesInMonth`.
 */
export function sumRecurringThroughDate(templates: TemplateLike[], asOf: Date): number {
  let total = 0;
  for (const t of templates) {
    const endCap = t.validTo != null && t.validTo < asOf ? t.validTo : asOf;
    for (const { y, m } of eachCalendarMonthInRange(t.validFrom, endCap)) {
      if (templateAppliesInMonth(t.validFrom, t.validTo, y, m)) {
        total += t.amount;
      }
    }
  }
  return total;
}

function ymParts(d: Date) {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

function eachCalendarMonthInRange(a: Date, b: Date): { y: number; m: number }[] {
  if (a.getTime() > b.getTime()) return [];
  const out: { y: number; m: number }[] = [];
  let { y, m } = ymParts(a);
  const end = ymParts(b);
  for (;;) {
    if (y > end.y || (y === end.y && m > end.m)) break;
    out.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
