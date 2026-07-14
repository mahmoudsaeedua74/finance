import type { ProjectType } from "@/lib/project-type";

export type ScopeComplexity = "low" | "mid" | "high";

export type ProjectScopeItem = {
  title: string;
  description?: string;
  /** Internal breakdown line amount — optional on client proposal */
  amount?: number;
  complexity?: ScopeComplexity;
  tech?: string;
};

export function isDetailedProjectType(type: ProjectType | string): boolean {
  return type !== "normal";
}

export function parseScopeItems(raw: unknown): ProjectScopeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): ProjectScopeItem | null => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = String(o.title ?? "").trim();
      if (!title) return null;
      const amountRaw = o.amount;
      const amount =
        amountRaw != null && amountRaw !== "" && Number.isFinite(Number(amountRaw))
          ? Number(amountRaw)
          : undefined;
      const complexityRaw = o.complexity;
      const complexity =
        complexityRaw === "low" || complexityRaw === "mid" || complexityRaw === "high"
          ? complexityRaw
          : undefined;
      return {
        title,
        description: typeof o.description === "string" ? o.description.trim().slice(0, 500) : "",
        amount,
        complexity,
        tech: typeof o.tech === "string" ? o.tech.trim().slice(0, 80) : "",
      };
    })
    .filter((x): x is ProjectScopeItem => x != null);
}

export function parseClientName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 120) : "";
}

export function complexityLabel(c: ScopeComplexity, t: (k: string) => string): string {
  return t(`scopeComplexity_${c}`);
}
