import type { ProjectType } from "@/lib/project-type";
import { roundMoney } from "@/lib/currency";

export type ScopeComplexity = "low" | "mid" | "high";

export type ProjectScopeItem = {
  title: string;
  description?: string;
  /**
   * Line price in the project's currency (EGP or SAR) — not hours.
   * Optional until you settle / bill.
   */
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

/** Sum of line prices that have an amount (project currency). */
export function sumScopeItemAmounts(items: ProjectScopeItem[]): number {
  return roundMoney(
    items.reduce(
      (s, i) =>
        s + (typeof i.amount === "number" && Number.isFinite(i.amount) ? i.amount : 0),
      0
    )
  );
}

export function parseClientName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 120) : "";
}

export function complexityLabel(c: ScopeComplexity, t: (k: string) => string): string {
  return t(`scopeComplexity_${c}`);
}
