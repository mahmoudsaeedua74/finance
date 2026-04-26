"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { playNotificationChime, isNotificationSoundEnabled } from "@/lib/notification-sound";
import { useNotificationSummary } from "@/hooks/use-notification-summary";

/**
 * Polls unread count, plays a chime and optional system notification when new alerts arrive.
 */
export function NotificationAudioWatcher() {
  const t = useTranslations("layout");
  const { data } = useNotificationSummary();
  const lastCount = useRef<number | null>(null);

  useEffect(() => {
    if (data == null) return;
    const n = data.data.unreadCount;
    if (lastCount.current === null) {
      lastCount.current = n;
      return;
    }
    if (n > lastCount.current) {
      if (isNotificationSoundEnabled()) {
        playNotificationChime();
      }
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState === "hidden" &&
        data.data.latest
      ) {
        try {
          new Notification(data.data.latest.title || t("notif.newAlert"), {
            body: data.data.latest.body,
            tag: "finance-alert",
          });
        } catch {
          // ignore
        }
      }
    }
    lastCount.current = n;
  }, [data, t]);

  return null;
}
