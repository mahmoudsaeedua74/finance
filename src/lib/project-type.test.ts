import { describe, expect, it } from "vitest";
import { buildProjectTypeMongoFilter, normalizeProjectType } from "@/lib/project-type";

describe("buildProjectTypeMongoFilter", () => {
  it("treats missing/legacy values as normal via $nin non-normal types", () => {
    expect(buildProjectTypeMongoFilter("normal")).toEqual({
      projectType: {
        $nin: ["css", "sdk", "frontend", "backend", "full-stack", "identity", "logo", "banners"],
      },
    });
  });

  it("matches explicit non-normal types exactly", () => {
    expect(buildProjectTypeMongoFilter("css")).toEqual({ projectType: "css" });
  });

  it("normalizeProjectType maps unknown to normal", () => {
    expect(normalizeProjectType(undefined)).toBe("normal");
    expect(normalizeProjectType("nope")).toBe("normal");
  });
});
