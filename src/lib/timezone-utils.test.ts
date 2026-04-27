import { describe, it, expect } from "vitest";
import { getHourAndDateKeyInZone } from "./timezone-utils";

describe("getHourAndDateKeyInZone", () => {
  it("returns a stable date key and hour 0–23 for Cairo zone", () => {
    const d = new Date("2026-06-15T09:30:00.000Z");
    const { hour, dateKey } = getHourAndDateKeyInZone(d, "Africa/Cairo");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });
});
