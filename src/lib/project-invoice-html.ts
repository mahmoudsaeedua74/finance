import { billingTotals, type ProjectBillingLine, type ProjectInvoiceMode } from "@/lib/project-billing";
import { DOC_BRAND } from "@/lib/project-document-html";

type InvoiceInput = {
  invoiceNumber: string;
  issuedOn: string;
  clientName: string;
  projectName: string;
  scopeLabel: string;
  mode: ProjectInvoiceMode;
  lines: ProjectBillingLine[];
  footerNote?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!
  ));
}

const amountFormat = new Intl.NumberFormat("en-EG", {
  style: "currency", currency: "EGP", currencyDisplay: "code",
});

export function buildInvoiceHtml(input: InvoiceInput) {
  const safe = escapeHtml;
  const { total, due, future, nextDueDate } = billingTotals(input.lines, input.issuedOn);
  const collected = input.mode === "collected";
  const state = collected ? "تم التحصيل" : due > 0 ? "مستحق السداد" : "دفعات مجدولة";
  const money = (amount: number) => safe(amountFormat.format(amount));
  const date = (value: string | null) => value ? safe(value.split("-").reverse().join(" / ")) : "—";
  const rows = input.lines.map((line) => {
    const status = line.dueDate && line.dueDate > input.issuedOn ? "مجدول" : "مستحق";
    return `<tr>
      <td><strong dir="auto">${safe(line.title)}</strong>${line.detail ? `<div class="description" dir="auto">${safe(line.detail)}</div>` : ""}</td>
      <td class="numeric">${date(line.dueDate)}</td>
      ${collected ? `<td class="numeric">${date(line.paidOn)}</td>` : `<td class="line-status">${status}</td>`}
      <td class="numeric">${money(line.amount)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safe(input.invoiceNumber)} - ${safe(input.projectName)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&amp;display=swap">
  <style>
    :root {
      --brand: ${DOC_BRAND.brand}; --brand-dark: ${DOC_BRAND.brandDark};
      --soft: ${DOC_BRAND.brandSoft}; --ink: ${DOC_BRAND.ink};
      --muted: ${DOC_BRAND.muted}; --line: ${DOC_BRAND.line}; --bg: ${DOC_BRAND.bg};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: #fff; color: var(--ink);
      font: 12px/1.55 "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    main { max-width: 183mm; margin: auto; }
    h1, h2, p, dl, dd { margin: 0; }
    h2 { font-size: 13px; margin-bottom: 6px; }
    header, .parties, .project, .payment-details, footer { break-inside: avoid; }
    .masthead {
      display: flex; justify-content: space-between; align-items: start; gap: 16px;
      border-top: 5px solid var(--brand); padding: 18px 0 16px;
    }
    .masthead h1 { font-size: 27px; line-height: 1.25; }
    .eyebrow { color: var(--brand-dark); font-size: 10px; font-weight: 700; letter-spacing: .12em; }
    .issuer { text-align: left; }
    .issuer strong { font-size: 19px; }
    .issuer p, .muted { color: var(--muted); }
    .badge {
      display: inline-block; background: var(--soft); color: var(--brand-dark);
      border-radius: 4px; font-weight: 700; margin-top: 9px; padding: 3px 9px;
    }
    .metadata { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-block: 1px solid var(--line); }
    .metadata > div { padding: 9px 12px; border-inline-end: 1px solid var(--line); }
    .metadata > div:last-child { border: 0; }
    dt { color: var(--muted); font-size: 10px; }
    dd { font-weight: 700; overflow-wrap: anywhere; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 15px 0; }
    .parties strong { font-size: 14px; overflow-wrap: anywhere; }
    .project {
      background: var(--bg); border-inline-start: 4px solid var(--brand);
      margin-bottom: 14px; padding: 9px 12px; overflow-wrap: anywhere;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    caption { text-align: right; font-weight: 700; font-size: 13px; margin-bottom: 6px; }
    thead { display: table-header-group; background: var(--ink); color: #fff; }
    tr { break-inside: avoid; }
    th, td { text-align: right; padding: 8px; }
    th { font-size: 10px; }
    td { border-bottom: 1px solid var(--line); vertical-align: top; overflow-wrap: anywhere; }
    tbody tr:nth-child(even) { background: var(--bg); }
    .description { color: var(--muted); font-size: 10px; white-space: pre-line; }
    .numeric { direction: ltr; text-align: center; font-variant-numeric: tabular-nums; }
    .line-status { color: var(--brand-dark); font-weight: 700; }
    .totals { margin: 16px 0 16px auto; width: min(100%, 89mm); break-inside: avoid; }
    .totals > div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 10px; }
    .totals dt { font-size: 11px; }
    .totals .grand { background: var(--ink); align-items: center; padding: 11px; margin-top: 4px; }
    .grand dt, .grand dd { color: #fff; }
    .grand dd { font-size: 19px; }
    .payment-details { border-top: 1px solid var(--line); padding-top: 10px; }
    .payment-details dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; }
    .payment-details [dir="ltr"] { text-align: right; }
    footer { border-bottom: 3px solid var(--brand); margin-top: 14px; padding-bottom: 8px; color: var(--muted); }
    @page { size: A4; margin: 13mm 14mm; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="masthead">
        <div>
          <p class="eyebrow" dir="ltr">${collected ? "PAYMENT RECEIPT" : "PAYMENT CLAIM"}</p>
          <h1>${collected ? "بيان بالمبالغ المحصّلة" : "مطالبة بالسداد"}</h1>
          <span class="badge">${state}</span>
        </div>
        <div class="issuer">
          <strong dir="ltr">${DOC_BRAND.nameEn}</strong>
          <p>خدمات تقنية</p>
        </div>
      </div>
      <dl class="metadata">
        <div><dt>رقم المستند</dt><dd><bdi>${safe(input.invoiceNumber)}</bdi></dd></div>
        <div><dt>تاريخ الإصدار</dt><dd><bdi>${date(input.issuedOn)}</bdi></dd></div>
        ${collected
          ? `<div><dt>عدد التحصيلات</dt><dd>${input.lines.length}</dd></div>`
          : `<div><dt>أقرب موعد سداد مفتوح</dt><dd><bdi>${date(nextDueDate)}</bdi></dd></div>`}
      </dl>
    </header>
    <section class="parties">
      <div><p class="muted">من</p><strong>${DOC_BRAND.nameAr}</strong><p><bdi>mahmoudsaeed0112074@gmail.com</bdi></p></div>
      <div><p class="muted">إلى</p><strong dir="auto">${safe(input.clientName || "—")}</strong></div>
    </section>
    <section class="project">
      <p class="muted">المشروع</p>
      <strong dir="auto">${safe(input.projectName)}</strong>
      <p dir="auto">${safe(input.scopeLabel)}</p>
    </section>
    <table>
      <caption>${collected ? "الدفعات المحصّلة" : "البنود غير المحصّلة"}</caption>
      <colgroup><col style="width:43%"><col style="width:18%"><col style="width:18%"><col style="width:21%"></colgroup>
      <thead>
        <tr>
          <th>البيان</th><th class="numeric">الاستحقاق</th>
          <th class="${collected ? "numeric" : ""}">${collected ? "تاريخ التحصيل" : "الحالة"}</th>
          <th class="numeric">${collected ? "المبلغ المحصّل" : "المبلغ المتبقي"}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <dl class="totals">
      ${!collected && future > 0 ? `
        <div><dt>المستحق حتى اليوم</dt><dd class="numeric">${money(due)}</dd></div>
        <div><dt>دفعات مجدولة لاحقًا</dt><dd class="numeric">${money(future)}</dd></div>
      ` : ""}
      <div class="grand"><dt>${collected ? "إجمالي المبالغ المحصّلة" : "إجمالي المبلغ المتبقي"}</dt><dd class="numeric">${money(total)}</dd></div>
    </dl>
    ${!collected ? `<section class="payment-details">
      <h2>بيانات التحويل البنكي</h2>
      <dl>
        <dt>اسم المستفيد</dt><dd dir="ltr">MAHMOUD SAEED MOHAMED MAHMOUD</dd>
        <dt>IBAN</dt><dd dir="ltr">EG97 0025 0040 0000 0040 1602 2800 1</dd>
        <dt>SWIFT</dt><dd dir="ltr">EBBKEGCX</dd>
      </dl>
    </section>` : ""}
    <footer>${input.footerNote ? `<p>${safe(input.footerNote)}</p>` : ""}<p>للاستفسار <bdi>01120847850</bdi></p></footer>
  </main>
</body>
</html>`;
}
