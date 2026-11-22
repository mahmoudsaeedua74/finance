import { roundMoney } from "@/lib/currency";
import { jsonFetch } from "@/lib/fetcher";
import { calculateHourlyTaskBalances } from "@/lib/feature-pricing";
import type { FeatureDto } from "@/types/feature";
import type { ProjectJobDto } from "@/types/project-job";

type Payout = ProjectJobDto["payouts"][number];
type BillableFeature = Pick<FeatureDto, "id" | "title" | "description" | "approvedPriceEgp" | "isArchived" | "status" | "type">
  & Partial<Pick<FeatureDto, "pricingMode" | "hourlyRateEgp">>
  & { tasks?: Pick<FeatureDto["tasks"][number], "id" | "title" | "billableSecondsForPayment">[] };
type BillableProject = Pick<ProjectJobDto, "name" | "agreedAmount" | "billingMode" | "expectedPaymentDate" | "payouts" | "scopeItems" | "status">;

export type ProjectBillingLine = {
  source: "contract" | "support" | "feature";
  featureId?: string;
  title: string;
  detail: string;
  dueDate: string | null;
  paidOn: string | null;
  amount: number;
  paid: number;
};

export type ProjectInvoiceMode = "outstanding" | "collected";
export type ProjectInvoiceScope = "project" | "contract" | "support" | `feature:${string}`;

const cairoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function billingDay(value: string | Date) {
  return cairoDate.format(new Date(value));
}

export async function loadProjectBilling(projectId: string) {
  const [{ data: job }, { data: features }] = await Promise.all([
    jsonFetch<{ data: ProjectJobDto }>(`/api/project-jobs/${projectId}`, { cache: "no-store" }),
    jsonFetch<{ data: FeatureDto[] }>(`/api/project-jobs/${projectId}/features?includeArchived=true`, { cache: "no-store" }),
  ]);
  return { job, features, lines: buildProjectBillingLines(job, features) };
}

export function buildProjectBillingLines(job: BillableProject, features: BillableFeature[]): ProjectBillingLine[] {
  type Group = Pick<ProjectBillingLine, "source" | "featureId" | "title" | "detail"> & {
    approved: number;
    dueDate?: string | null;
    payouts: Payout[];
    taskTitles?: Map<string, string>;
  };
  const lines: ProjectBillingLine[] = [];

  function addGroup({ approved, dueDate, payouts, taskTitles, ...identity }: Group) {
    const paidRows = payouts.filter((p) => p.isCollected);
    const openRows = payouts.filter((p) => !p.isCollected)
      .sort((a, b) => (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date));
    let available = roundMoney(approved);
    for (const payout of [...paidRows, ...openRows]) {
      const amount = Math.min(available, roundMoney(payout.amount));
      if (!payout.isCollected && amount <= 0) continue;
      available = roundMoney(available - amount);
      const paidOn = payout.isCollected ? billingDay(payout.collectedAt ?? payout.date) : null;
      const generatedBalance = payout.note === "Remaining balance" || payout.note === "Pending collection";
      const legacyDueDate = generatedBalance ? dueDate : payout.date;
      const scheduled = payout.dueDate ?? (payout.isCollected ? null : legacyDueDate);
      const note = payout.note && !["Pending collection", "Remaining balance", "Partial collection"].includes(payout.note)
        ? payout.note : "";
      const taskTitle = payout.taskId ? taskTitles?.get(payout.taskId) ?? note : "";
      lines.push({
        ...identity,
        title: taskTitle || identity.title,
        detail: taskTitle ? identity.title : note || identity.detail,
        dueDate: scheduled ? billingDay(scheduled) : null,
        paidOn,
        amount,
        paid: payout.isCollected ? roundMoney(payout.amount) : 0,
      });
    }
    if (available > 0 || payouts.length === 0) {
      lines.push({ ...identity, dueDate: dueDate ? billingDay(dueDate) : null, paidOn: null, amount: available, paid: 0 });
    }
  }

  const installments = job.payouts.filter((p) => p.lineKind === "installment");
  const paidInstallments = installments.filter((p) => p.isCollected);
  const sum = (payouts: Payout[]) => roundMoney(payouts.reduce((total, p) => total + p.amount, 0));
  const cancelled = job.status === "cancelled";
  addGroup({
    source: "contract",
    title: job.name,
    detail: job.scopeItems.map((item) => item.title).join(" · "),
    approved: cancelled ? sum(paidInstallments) : job.billingMode === "retainer" ? sum(installments) : job.agreedAmount,
    dueDate: job.expectedPaymentDate,
    payouts: cancelled ? paidInstallments : installments,
  });

  const featurePayouts = job.payouts.filter((p) => p.lineKind === "feature");
  const payoutsByFeature = new Map<string | null, Payout[]>();
  for (const payout of featurePayouts) {
    const id = payout.featureId ?? null;
    const rows = payoutsByFeature.get(id) ?? [];
    rows.push(payout);
    payoutsByFeature.set(id, rows);
  }
  for (const feature of features) {
    const matching = payoutsByFeature.get(feature.id) ?? [];
    payoutsByFeature.delete(feature.id);
    const withdrawn = cancelled || feature.status === "cancelled";
    const payouts = withdrawn ? matching.filter((p) => p.isCollected) : matching;
    const tasks = feature.tasks ?? [];
    const hourly = feature.pricingMode === "hourly" && !withdrawn && !feature.isArchived;
    const balances = hourly
      ? calculateHourlyTaskBalances(tasks, payouts, feature.hourlyRateEgp ?? 0, feature.approvedPriceEgp)
      : [];
    const taskTotal = balances.reduce((total, task) => total + task.collectableAmountEgp, 0);
    if ((feature.isArchived || withdrawn || feature.approvedPriceEgp == null) && payouts.length === 0 && taskTotal <= 0) continue;
    const identity = {
      source: feature.type === "technical_support" ? "support" as const : "feature" as const,
      featureId: feature.id,
    };
    const recordedAmount = sum(payouts);
    const featureAmount = withdrawn || feature.approvedPriceEgp == null
      ? recordedAmount
      : Math.max(0, roundMoney(feature.approvedPriceEgp - taskTotal));
    if (featureAmount > 0 || payouts.length > 0) addGroup({
      ...identity,
      title: feature.title,
      detail: feature.description,
      approved: featureAmount,
      payouts,
      taskTitles: new Map(tasks.map((task) => [task.id, task.title])),
    });
    balances.forEach((balance, index) => {
      if (balance.collectableAmountEgp <= 0) return;
      lines.push({
        ...identity,
        title: tasks[index].title,
        detail: feature.title,
        dueDate: null,
        paidOn: null,
        amount: balance.collectableAmountEgp,
        paid: 0,
      });
    });
  }
  for (const [featureId, payouts] of Array.from(payoutsByFeature.entries())) {
    const applicable = cancelled ? payouts.filter((p) => p.isCollected) : payouts;
    if (applicable.length) addGroup({
      source: "feature",
      featureId: featureId ?? undefined,
      title: "إضافة على المشروع",
      detail: "",
      approved: sum(applicable),
      payouts: applicable,
    });
  }

  for (const payout of job.payouts) {
    if (payout.lineKind !== "support" || (cancelled && !payout.isCollected)) continue;
    addGroup({ source: "support", title: "دعم المشروع", detail: "", approved: payout.amount, payouts: [payout] });
  }
  return lines.sort((a, b) => (a.dueDate ?? a.paidOn ?? "9999").localeCompare(b.dueDate ?? b.paidOn ?? "9999"));
}

export function selectInvoiceLines(
  lines: ProjectBillingLine[],
  scope: ProjectInvoiceScope,
  mode: ProjectInvoiceMode,
) {
  return lines.flatMap((line) => {
    const matches = scope === "project" || scope === line.source || scope === `feature:${line.featureId}`;
    if (!matches) return [];
    const amount = mode === "collected" ? line.paid : roundMoney(line.amount - line.paid);
    if (amount <= 0) return [];
    return [{
      ...line,
      amount,
      paid: mode === "collected" ? amount : 0,
      paidOn: mode === "collected" ? line.paidOn : null,
    }];
  }).sort((a, b) => {
    const aDate = (mode === "collected" ? a.paidOn : a.dueDate) ?? "9999";
    const bDate = (mode === "collected" ? b.paidOn : b.dueDate) ?? "9999";
    return aDate.localeCompare(bDate);
  });
}

export function billingTotals(lines: ProjectBillingLine[], today: string) {
  let total = 0;
  let paid = 0;
  let due = 0;
  let future = 0;
  let nextDueDate: string | null = null;
  for (const line of lines) {
    total += line.amount;
    paid += line.paid;
    const balance = roundMoney(Math.max(0, line.amount - line.paid));
    if (balance === 0) continue;
    if (line.dueDate && line.dueDate > today) future += balance;
    else due += balance;
    if (line.dueDate && (!nextDueDate || line.dueDate < nextDueDate)) nextDueDate = line.dueDate;
  }
  return { total: roundMoney(total), paid: roundMoney(paid), due: roundMoney(due), future: roundMoney(future), nextDueDate };
}
