import { describe, expect, it } from "vitest";
import { featureProjectLineFilter, originalProjectLineFilter } from "@/lib/db-month-filters";

describe("project financial boundaries", () => {
  it("keeps legacy/original project lines separate from features", () => {
    expect(originalProjectLineFilter()).toEqual({ lineKind: { $in: ["installment", null] } });
    expect(featureProjectLineFilter()).toEqual({ lineKind: "feature" });
    expect(featureProjectLineFilter("feature-id")).toEqual({ lineKind: "feature", featureId: "feature-id" });
  });
});
