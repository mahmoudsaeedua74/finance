export type NotifRow = {
  _id: string;
  title: string;
  body: string;
  type?: string;
  severity: "info" | "warning" | "critical" | "success";
  readAt?: string | null;
  createdAt?: string;
};

export function notificationRowClassName(r: NotifRow) {
  if (r.type === "expense.recurring_due" || r.severity === "success") {
    return "border border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-950/30";
  }
  if (r.type === "expense.recurring_due_soon") {
    return "border border-amber-500/50 bg-amber-500/10 dark:border-amber-500/35 dark:bg-amber-950/25";
  }
  if (r.severity === "critical") {
    return "border border-destructive/50 bg-destructive/5";
  }
  if (r.severity === "warning") {
    return "border border-amber-500/30 bg-amber-500/5";
  }
  return "border border-border/80 bg-card";
}

export function notifTypeBadgeClass(type?: string) {
  if (type?.startsWith("expense.")) {
    return "bg-primary/10 text-primary border-primary/20";
  }
  if (type?.includes("budget")) {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/20";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

export function notifTypeLabel(
  type: string | undefined,
  t: (key: string) => string
) {
  if (!type) return t("notif.typeUnknown");
  if (type === "expense.recurring_due") return t("notif.typeRecurringDue");
  if (type === "expense.recurring_due_soon") return t("notif.typeRecurringSoon");
  if (type === "budget.over" || type === "budget.near_limit") return t("notif.typeBudget");
  if (type === "finance.net_lower") return t("notif.typeNet");
  if (type.startsWith("income.")) return t("notif.typeIncome");
  if (type.startsWith("auth.")) return t("notif.typeAuth");
  if (type.startsWith("behavior.")) return t("notif.typeBehavior");
  if (type.startsWith("digest") || type.includes("digest")) return t("notif.typeDigest");
  return type.replace(/\./g, " · ");
}
