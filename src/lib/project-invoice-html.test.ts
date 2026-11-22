import { describe, expect, it } from "vitest";
import { billingDay, billingTotals, buildProjectBillingLines, selectInvoiceLines } from "@/lib/project-billing";
import { buildInvoiceHtml } from "@/lib/project-invoice-html";
import type { ProjectJobDto } from "@/types/project-job";

type Payout = ProjectJobDto["payouts"][number];

function installment(id: string, date: string, paidOn?: string, amount = 20_000): Payout {
  return {
    id, date: paidOn ?? date, dueDate: date, collectedAt: paidOn ?? null, isCollected: Boolean(paidOn),
    amount, paymentMethod: paidOn ? "cash" : "unspecified", note: "", lineKind: "installment",
  };
}

describe("project payment claims", () => {
  it("claims every unpaid hourly task without price approval and excludes prior collections", () => {
    const feature = {
      id: "hourly",
      title: "Store changes",
      description: "",
      approvedPriceEgp: null,
      status: "in_progress",
      isArchived: false,
      type: "new_feature",
      pricingMode: "hourly",
      hourlyRateEgp: 500,
      tasks: [
        { id: "legacy", title: "Legacy task", billableSecondsForPayment: 3600 },
        { id: "paid", title: "Paid task", billableSecondsForPayment: 3600 },
        { id: "unpaid", title: "Unpaid task", billableSecondsForPayment: 3600 },
      ],
    } as const;
    const job = {
      name: "Paid base contract",
      agreedAmount: 10_000,
      billingMode: "fixed",
      expectedPaymentDate: null,
      status: "collected",
      scopeItems: [],
      payouts: [
        installment("base", "2026-10-01", "2026-10-10", 10_000),
        {
          ...installment("old", "2026-11-10", "2026-11-10", 500),
          lineKind: "feature", featureId: feature.id,
        },
        {
          ...installment("linked", "2026-11-21", "2026-11-21", 500),
          lineKind: "feature", featureId: feature.id, taskId: "paid",
        },
      ],
    } satisfies Parameters<typeof buildProjectBillingLines>[0];
    const lines = buildProjectBillingLines(job, [{ ...feature, tasks: [...feature.tasks] }]);
    const unpaid = selectInvoiceLines(lines, "project", "outstanding");
    expect(unpaid).toEqual([expect.objectContaining({ title: "Unpaid task", amount: 500 })]);
    expect(selectInvoiceLines(lines, "project", "collected")).toContainEqual(
      expect.objectContaining({ title: "Paid task", amount: 500 }),
    );
    const html = buildInvoiceHtml({
      invoiceNumber: "CLM-TEST", issuedOn: "2026-11-22", clientName: "عميل تجريبي",
      projectName: job.name, scopeLabel: "المشروع كله", mode: "outstanding", lines: unpaid,
    });
    expect(html).toContain("Unpaid task");
    expect(html).not.toContain("Paid task");
    expect(html).not.toContain("10,000.00");
  });

  it("builds an outstanding-only claim and separates amounts due now from scheduled amounts", () => {
    const lines = buildProjectBillingLines({
      name: "متجر <ألف>",
      billingMode: "retainer",
      agreedAmount: 20_000,
      expectedPaymentDate: null,
      status: "partial",
      scopeItems: [],
      payouts: [
        installment("1", "2026-10-01", "2026-11-04"),
        installment("2", "2026-11-01"),
        installment("3", "2026-12-01"),
      ],
    }, []);

    expect(lines[0]).toMatchObject({ dueDate: "2026-10-01", paidOn: "2026-11-04", paid: 20_000 });
    expect(billingTotals(lines, "2026-11-22")).toEqual({
      total: 60_000, paid: 20_000, due: 20_000, future: 20_000, nextDueDate: "2026-11-01",
    });

    const html = buildInvoiceHtml({
      invoiceNumber: "INV-123",
      issuedOn: billingDay("2026-11-21T23:30:00Z"),
      clientName: "Client",
      projectName: "متجر <ألف>",
      scopeLabel: "المشروع كله",
      mode: "outstanding",
      lines: selectInvoiceLines(lines, "project", "outstanding"),
    });
    expect(html).toContain("متجر &lt;ألف&gt;");
    expect(html).not.toContain("04 / 11 / 2026");
    expect(html).toContain("مستحق");
    expect(html).toContain("دفعات مجدولة لاحقًا");
    expect(html).toMatch(/إجمالي المبلغ المتبقي<\/dt><dd class="numeric">EGP\s+40,000\.00/);
    expect(html).toContain("22 / 11 / 2026");
  });

  it("includes archived additions with payment history and caps fixed contract schedules at the agreed amount", () => {
    const lines = buildProjectBillingLines({
      name: "Project",
      billingMode: "fixed",
      agreedAmount: 1000,
      expectedPaymentDate: null,
      status: "partial",
      scopeItems: [],
      payouts: [
        installment("1", "2026-10-01", "2026-10-10", 700),
        installment("2", "2026-11-01", undefined, 500),
        { ...installment("3", "2026-11-01", "2026-11-10", 100), lineKind: "feature", featureId: "feature" },
      ],
    }, [
      { id: "feature", title: "Archived addition", description: "", approvedPriceEgp: 200, status: "completed", isArchived: true, type: "new_feature" },
    ]);
    expect(billingTotals(lines, "2026-11-22")).toMatchObject({ total: 1200, paid: 800, due: 400, future: 0 });
  });

  it("scopes a part-paid addition and produces a separate collected statement with receipt dates", () => {
    const lines = buildProjectBillingLines({
      name: "Base project",
      agreedAmount: 5000,
      billingMode: "fixed",
      expectedPaymentDate: null,
      status: "collected",
      scopeItems: [],
      payouts: [
        installment("base", "2026-10-01", "2026-10-10", 5000),
        { ...installment("partial", "2026-11-23", "2026-11-18", 400), lineKind: "feature", featureId: "form" },
        { ...installment("planned", "2026-12-23", undefined, 1000), lineKind: "feature", featureId: "other" },
        { ...installment("support", "2026-09-10", "2026-09-11", 600), lineKind: "support" },
      ],
    }, [
      { id: "form", title: "New form", description: "", approvedPriceEgp: 1000, status: "completed", isArchived: false, type: "new_feature" },
      { id: "other", title: "Other feature", description: "", approvedPriceEgp: 1000, status: "pending", isArchived: false, type: "new_feature" },
      { id: "tech", title: "Technical support", description: "", approvedPriceEgp: 200, status: "completed", isArchived: false, type: "technical_support" },
    ]);
    const claim = selectInvoiceLines(lines, "feature:form", "outstanding");
    const received = selectInvoiceLines(lines, "feature:form", "collected");
    expect(claim).toEqual([expect.objectContaining({ title: "New form", amount: 600, paid: 0, paidOn: null })]);
    expect(received).toEqual([expect.objectContaining({ title: "New form", amount: 400, paidOn: "2026-11-18" })]);
    expect(selectInvoiceLines(lines, "support", "outstanding").map((line) => line.amount)).toEqual([200]);
    expect(selectInvoiceLines(lines, "support", "collected").map((line) => line.amount)).toEqual([600]);
    expect(selectInvoiceLines(lines, "project", "collected").map((line) => line.amount)).toEqual([600, 5000, 400]);

    const html = buildInvoiceHtml({
      invoiceNumber: "RCT-124",
      clientName: "Client",
      projectName: "Base project",
      scopeLabel: "New form",
      mode: "collected",
      issuedOn: "2026-11-22",
      lines: received,
    });
    expect(html).toContain("18 / 11 / 2026");
    expect(html).toMatch(/إجمالي المبالغ المحصّلة<\/dt><dd class="numeric">EGP\s+400\.00/);
    expect(html).not.toContain("بيانات التحويل البنكي");
    expect(html).not.toContain("Other feature");
  });
});
