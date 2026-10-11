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

export type ProjectTypePreset = (typeof PROJECT_TYPES)[number];

/** Preset slug or a free-text custom type the user added. */
export type ProjectType = ProjectTypePreset | (string & {});

export function isPresetProjectType(s: string): s is ProjectTypePreset {
  return (PROJECT_TYPES as readonly string[]).includes(s);
}

export function normalizeProjectType(raw: unknown): ProjectType {
  if (typeof raw !== "string") return "normal";
  const s = raw.trim();
  if (!s) return "normal";
  return s;
}

export function parseProjectTypeBody(raw: unknown): ProjectType | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return normalizeProjectType(raw);
}

/** Mongo filter: legacy jobs without projectType count as normal. */
export function buildProjectTypeMongoFilter(type: ProjectType): Record<string, unknown> {
  if (type === "normal") {
    return {
      $or: [
        { projectType: { $exists: false } },
        { projectType: null },
        { projectType: "" },
        { projectType: "normal" },
      ],
    };
  }
  return { projectType: type };
}
