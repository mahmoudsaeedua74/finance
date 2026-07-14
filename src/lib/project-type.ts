export const PROJECT_TYPES = [
  "normal",
  "css",
  "sdk",
  "frontend",
  "backend",
  "full-stack",
  "identity",
  "logo",
  "banners",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export function normalizeProjectType(raw: unknown): ProjectType {
  if (typeof raw === "string" && PROJECT_TYPES.includes(raw as ProjectType)) {
    return raw as ProjectType;
  }
  return "normal";
}

export function parseProjectTypeBody(raw: unknown): ProjectType | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return normalizeProjectType(raw);
}

/** Mongo filter: legacy jobs without projectType count as normal. */
export function buildProjectTypeMongoFilter(type: ProjectType): Record<string, unknown> {
  if (type === "normal") {
    const nonNormalTypes = PROJECT_TYPES.filter((t) => t !== "normal");
    return { projectType: { $nin: nonNormalTypes } };
  }
  return { projectType: type };
}
