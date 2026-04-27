"use client";

import { useEffect } from "react";

const STORAGE_KEY = "finance_dashboard_activity_ping_v1";

/** Once per browser tab session: marks dashboard activity so login-reminder emails respect «opened app». */
export function SessionActivityPing() {
  useEffect(() => {
    try {
      if (typeof sessionStorage === "undefined") return;
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      void fetch("/api/session/activity-ping", {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
