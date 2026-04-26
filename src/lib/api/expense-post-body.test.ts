import { describe, expect, it } from "vitest";
import { parseExpensePostBody } from "./expense-post-body";

describe("parseExpensePostBody", () => {
  it("rejects non-object", () => {
    const r = parseExpensePostBody(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects missing title or amount", () => {
    expect(parseExpensePostBody({ amount: 1 }).ok).toBe(false);
    expect(parseExpensePostBody({ title: "x" }).ok).toBe(false);
  });

  it("rejects non-finite amount", () => {
    const r = parseExpensePostBody({ title: "a", amount: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("amount");
  });

  it("parses one-off variable expense", () => {
    const r = parseExpensePostBody({
      title: "Coffee",
      amount: 4.5,
      kind: "variable",
      date: "2024-03-15T00:00:00.000Z",
      category: "general",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.variant).toBe("oneoff");
      if (r.data.variant === "oneoff") {
        expect(r.data.kind).toBe("variable");
        expect(r.data.title).toBe("Coffee");
        expect(r.data.amount).toBe(4.5);
      }
    }
  });

  it("parses recurring template", () => {
    const r = parseExpensePostBody({
      title: "Gym",
      amount: 30,
      isTemplate: true,
      recurring: true,
      validFrom: "2024-01-01T00:00:00.000Z",
      validTo: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.variant).toBe("recurring");
      if (r.data.variant === "recurring") {
        expect(r.data.validTo).toBeNull();
      }
    }
  });

  it("requires date for one-off", () => {
    const r = parseExpensePostBody({ title: "a", amount: 1, isTemplate: false });
    expect(r.ok).toBe(false);
  });

  it("requires validFrom for recurring", () => {
    const r = parseExpensePostBody({
      title: "a",
      amount: 1,
      isTemplate: true,
      recurring: true,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects due day outside 1–30 for recurring", () => {
    const r = parseExpensePostBody({
      title: "a",
      amount: 1,
      isTemplate: true,
      recurring: true,
      validFrom: "2024-01-01T00:00:00.000Z",
      dueDayOfMonth: 31,
    });
    expect(r.ok).toBe(false);
  });

  it("accepts due day 1–30 for recurring", () => {
    const r = parseExpensePostBody({
      title: "Net",
      amount: 200,
      isTemplate: true,
      recurring: true,
      validFrom: "2024-01-10T00:00:00.000Z",
      validTo: null,
      dueDayOfMonth: 10,
    });
    expect(r.ok).toBe(true);
    if (r.ok && r.data.variant === "recurring") {
      expect(r.data.dueDayOfMonth).toBe(10);
    }
  });
});
