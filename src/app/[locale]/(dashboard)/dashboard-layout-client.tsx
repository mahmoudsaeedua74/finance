"use client";

import { AppShell } from "@/components/layout/app-shell";
import { SessionActivityPing } from "@/components/session-activity-ping";
import { MonthProvider } from "@/context/month-context";
import type { ReactNode } from "react";

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <MonthProvider>
      <SessionActivityPing />
      <AppShell>{children}</AppShell>
    </MonthProvider>
  );
}
