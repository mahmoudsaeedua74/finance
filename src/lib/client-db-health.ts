/** Client-only: call server DB health to distinguish auth failures from broken Mongo. */
export type DbHealthOk = { ok: true };
export type DbHealthFail = { ok: false; message: string };
export type DbHealth = DbHealthOk | DbHealthFail;

export async function checkDbOnClient(): Promise<DbHealth> {
  const r = await fetch("/api/health/db", { cache: "no-store" });
  const d = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    details?: { errorMessage?: string };
  };
  if (r.ok && d.ok) return { ok: true };
  const msg = d.details?.errorMessage || d.message || "Database connection failed";
  return { ok: false, message: msg };
}
