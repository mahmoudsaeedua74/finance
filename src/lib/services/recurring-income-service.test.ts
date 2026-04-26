import { describe, it, expect } from "vitest";
import { iterateMonths } from "./recurring-income-service";

function collect(
  y0: number,
  m0: number,
  y1: number,
  m1: number
) {
  return Array.from(iterateMonths(y0, m0, y1, m1));
}

describe("iterateMonths", () => {
  it("yields a single month when start equals end", () => {
    expect(collect(2026, 3, 2026, 3)).toEqual([{ y: 2026, m: 3 }]);
  });
  it("crosses a year boundary", () => {
    const r = collect(2025, 11, 2026, 1);
    expect(r).toEqual([
      { y: 2025, m: 11 },
      { y: 2025, m: 12 },
      { y: 2026, m: 1 },
    ]);
  });
});
