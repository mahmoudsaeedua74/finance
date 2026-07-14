import type { NotifRow } from "@/lib/notification-ui-styles";

export function notificationProjectJobId(row: NotifRow): string | null {
  const meta = row.meta as { jobId?: string } | undefined;
  if (meta?.jobId && /^[a-f0-9]{24}$/i.test(meta.jobId)) return meta.jobId;
  if (!row.type?.startsWith("project.")) return null;
  const key = row.dedupKey ?? "";
  const m = key.match(
    /^project-(?:due-soon|due|overdue)-([a-f0-9]{24})-/i
  );
  return m?.[1] ?? null;
}

export function notificationProjectHref(row: NotifRow): string | null {
  const id = notificationProjectJobId(row);
  return id ? `/projects/${id}` : null;
}
