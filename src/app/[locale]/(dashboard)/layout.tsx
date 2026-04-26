import type { ReactNode } from "react";
import { DashboardLayoutClient } from "./dashboard-layout-client";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
