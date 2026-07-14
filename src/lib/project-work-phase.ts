export const WORK_PHASES = ["quote", "in_progress", "delivered"] as const;

export type WorkPhase = (typeof WORK_PHASES)[number];

export function normalizeWorkPhase(raw: unknown): WorkPhase {
  if (raw === "quote" || raw === "in_progress" || raw === "delivered") return raw;
  return "in_progress";
}

export function parseWorkPhaseBody(raw: unknown): WorkPhase | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  return normalizeWorkPhase(raw);
}

export function defaultWorkPhaseForCreate(isCollected: boolean): WorkPhase {
  return isCollected ? "delivered" : "quote";
}
