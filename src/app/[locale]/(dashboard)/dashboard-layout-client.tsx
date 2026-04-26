"use client";

import { AppShell } from "@/components/layout/app-shell";
import { MonthProvider } from "@/context/month-context";
import type { ReactNode } from "react";

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <MonthProvider>
      <AppShell>{children}</AppShell>
    </MonthProvider>
  );
}
