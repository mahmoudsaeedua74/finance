import { Notification, type NotificationSeverity } from "@/lib/models";

export async function notifyOnce(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  dedupKey: string;
  dedupWindowHours?: number;
  meta?: Record<string, unknown>;
}) {
  const from = new Date(Date.now() - (input.dedupWindowHours ?? 24) * 60 * 60 * 1000);
  const exists = await Notification.findOne({
    userId: input.userId,
    dedupKey: input.dedupKey,
    createdAt: { $gte: from },
  }).lean();
  if (exists) return exists;
  return Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity || "info",
    dedupKey: input.dedupKey,
    meta: input.meta || {},
  });
}
