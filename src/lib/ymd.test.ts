import { describe, it, expect } from "vitest";
import { toLocalYmd } from "./ymd";

describe("toLocalYmd", () => {
  it("uses local calendar day (not UTC) for a noon local date", () => {
    const d = new Date(2026, 4, 1, 12, 0, 0, 0);
    expect(toLocalYmd(d)).toBe("2026-05-01");
  });
});
