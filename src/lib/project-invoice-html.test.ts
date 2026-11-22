import { describe, expect, it } from "vitest";
import { buildInvoiceHtml } from "@/lib/project-document-html";

describe("project invoice html", () => {
  it("keeps approved additions and paid/due payment states in the invoice", () => {
    const html = buildInvoiceHtml({
      invoiceNumber: "INV-123",
      dateLabel: "22 / 11 / 2026",
      clientName: "Client",
      projectName: "Project",
      currency: "EGP",
      lines: [
        { title: "Project", amount: 5000 },
        { title: "Feature", description: "Approved addition", amount: 1000 },
      ],
      payments: [
        { description: "Original installment", date: "22 / 11 / 2026", amount: 2000, collected: true },
        { description: "Feature payment", date: "22 / 12 / 2026", amount: 1000, collected: false },
      ],
    });

    expect(html).toContain("INV-123");
    expect(html).toContain("Approved addition");
    expect(html).toContain("مدفوع");
    expect(html).toContain("مستحق");
    expect(html).toContain("المدفوع حتى الآن");
    expect(html).toContain("المتبقي المستحق");
  });
});
