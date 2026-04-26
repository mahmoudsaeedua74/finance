import { describe, it, expect } from "vitest";
import { defaultFormDateYmd, toLocalYmd } from "./ymd";

describe("toLocalYmd", () => {
  it("uses local calendar day (not UTC) for a noon local date", () => {
    const d = new Date(2026, 4, 1, 12, 0, 0, 0);
    expect(toLocalYmd(d)).toBe("2026-05-01");
  });
});

describe("defaultFormDateYmd", () => {
  it("matches the local calendar for today (same as toLocalYmd(new Date()))", () => {
    expect(defaultFormDateYmd()).toBe(toLocalYmd(new Date()));
  });
});
