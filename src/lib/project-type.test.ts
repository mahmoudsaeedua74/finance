import { describe, expect, it } from "vitest";
import {
  buildProjectTypeMongoFilter,
  isPresetProjectType,
  normalizeProjectType,
} from "@/lib/project-type";

describe("buildProjectTypeMongoFilter", () => {
  it("matches missing/empty/normal as normal", () => {
    expect(buildProjectTypeMongoFilter("normal")).toEqual({
      $or: [
        { projectType: { $exists: false } },
        { projectType: null },
        { projectType: "" },
        { projectType: "normal" },
      ],
    });
  });

  it("matches explicit types exactly", () => {
    expect(buildProjectTypeMongoFilter("css")).toEqual({ projectType: "css" });
    expect(buildProjectTypeMongoFilter("متجر مخصص")).toEqual({
      projectType: "متجر مخصص",
    });
  });

  it("normalizeProjectType keeps custom labels", () => {
    expect(normalizeProjectType(undefined)).toBe("normal");
    expect(normalizeProjectType("")).toBe("normal");
    expect(normalizeProjectType("nope")).toBe("nope");
    expect(normalizeProjectType("  css  ")).toBe("css");
  });

  it("isPresetProjectType", () => {
    expect(isPresetProjectType("normal")).toBe(true);
    expect(isPresetProjectType("متجر")).toBe(false);
  });
});
