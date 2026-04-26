import { describe, expect, it } from "vitest";
import { buildMonthViewExpenseRows, buildTemplatesListRows } from "./expense-list-response";

function row(
  partial: {
    _id: string;
    isTemplate: boolean;
    recurring: boolean;
    kind: "variable" | "fixed";
    date: Date;
    validFrom: Date;
    validTo: Date | null;
    title: string;
    amount: number;
  }
) {
  return {
    _id: partial._id,
    title: partial.title,
    amount: partial.amount,
    date: partial.date,
    category: "general",
    kind: partial.kind,
    recurring: partial.recurring,
    isTemplate: partial.isTemplate,
    validFrom: partial.validFrom,
    validTo: partial.validTo,
    projectName: "",
  };
}

describe("buildMonthViewExpenseRows", () => {
  it("merges and sorts by date desc, maps row kinds", () => {
    const d1 = new Date(2024, 2, 5);
    const dTpl = new Date(2022, 0, 1);
    const nonT = [
      row({
        _id: "a",
        isTemplate: false,
        recurring: false,
        kind: "variable",
        date: d1,
        validFrom: d1,
        validTo: null,
        title: "v1",
        amount: 1,
      }),
    ];
    const tpl = [
      row({
        _id: "b",
        isTemplate: true,
        recurring: true,
        kind: "fixed",
        date: dTpl,
        validFrom: dTpl,
        validTo: null,
        title: "sub",
        amount: 10,
      }),
    ];
    const entries = buildMonthViewExpenseRows(
      [nonT[0] as never],
      [tpl[0] as never],
      2024,
      3
    );
    expect(entries.length).toBe(2);
    expect(entries[0].rowKind).toBe("variable");
    expect(entries[0].title).toBe("v1");
    expect(entries[1].rowKind).toBe("recurring");
    expect(entries[1].displayDate).toBeDefined();
  });
});

describe("buildTemplatesListRows", () => {
  it("marks template rows as recurring in rowKind", () => {
    const t = new Date(2023, 0, 1);
    const rows = buildTemplatesListRows([
      row({
        _id: "x",
        isTemplate: true,
        recurring: true,
        kind: "fixed",
        date: t,
        validFrom: t,
        validTo: null,
        title: "R",
        amount: 5,
      }) as never,
    ]);
    expect(rows[0].rowKind).toBe("recurring");
  });
});
