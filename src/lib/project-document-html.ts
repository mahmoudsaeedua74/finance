import { formatMoney } from "@/lib/format";
import {
  sumScopeItemAmounts,
  type ProjectScopeItem,
  type ScopeComplexity,
} from "@/lib/project-scope";

export type DocumentAudience = "client" | "internal";

/** Locked brand tokens — same as upWord/css `_reports` (MAHMOUD SAEED). */
export const DOC_BRAND = {
  nameEn: "MAHMOUD SAEED",
  nameAr: "محمود سعيد",
  brand: "#4E45E4",
  brandDark: "#4237CA",
  brandSoft: "#EEEDFC",
  warn: "#B45309",
  ink: "#1E1E1E",
  muted: "#6B7280",
  line: "#E5E7EB",
  bg: "#F8F9FA",
} as const;

const COMPLEXITY_AR: Record<ScopeComplexity, string> = {
  low: "بسيط",
  mid: "متوسط",
  high: "عالي",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * html2canvas splits an RTL text node on every space, then draws each Arabic
 * letter alone. Words lose their spaces and their letters disconnect.
 * One inline-block per word keeps a single shaped run, and a gap between them.
 * A Latin-leading line stays one LTR run so "ATHAR & nfas" is not reversed.
 */
function rtlHtml(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const firstStrong = s.match(/[A-Za-z\u0600-\u06FF]/);
  const arabicFirst = !firstStrong || /[\u0600-\u06FF]/.test(firstStrong[0]);
  if (!arabicFirst) return `<bdi class="tok" dir="ltr">${esc(s)}</bdi>`;
  return s
    .split(/\s+/)
    .map((part) => {
      const safe = esc(part);
      if (/[A-Za-z0-9]/.test(part) && !/[\u0600-\u06FF]/.test(part)) {
        return `<bdi class="tok" dir="ltr">${safe}</bdi>`;
      }
      return `<span class="tok">${safe}</span>`;
    })
    .join("");
}

function docFontLinks(): string {
  return `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
  `;
}

/** Shared CSS matching `_reports/template/report-template.html`. */
function docStyles(): string {
  return `
    :root {
      --brand: ${DOC_BRAND.brand};
      --brand-dark: ${DOC_BRAND.brandDark};
      --brand-soft: ${DOC_BRAND.brandSoft};
      --warn: ${DOC_BRAND.warn};
      --ink: ${DOC_BRAND.ink};
      --muted: ${DOC_BRAND.muted};
      --line: ${DOC_BRAND.line};
      --bg: ${DOC_BRAND.bg};
      --white: #fff;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "IBM Plex Sans Arabic", Tahoma, sans-serif;
      background: #fff;
      color: var(--ink);
      line-height: 1.65;
      font-size: 13.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-synthesis: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      direction: rtl;
      letter-spacing: 0;
    }

    .tok {
      display: inline-block;
      white-space: nowrap;
      letter-spacing: 0;
      unicode-bidi: isolate;
    }
    .tok + .tok { margin-inline-start: 0.35em; }
    bdi.tok { direction: ltr; }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: var(--white);
      padding: 14mm 16mm 16mm;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .page-chrome {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1.5px solid var(--brand);
    }
    .page-chrome .identity {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--brand);
      direction: ltr;
      unicode-bidi: embed;
    }
    .page-chrome .doc-label {
      font-size: 10px;
      color: var(--muted);
    }

    .doc-head { margin: 8px 0 12px; }
    .doc-head h1 {
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 4px;
      line-height: 1.45;
    }
    .doc-head .sub {
      font-size: 12px;
      color: var(--muted);
    }
    .doc-head .byline {
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
    }

    .meta {
      background: var(--bg);
      border: 1px solid var(--line);
      border-right: 4px solid var(--brand);
      padding: 12px 14px;
      margin: 0 0 16px;
      display: grid;
      gap: 6px;
      font-size: 12px;
    }
    .meta .row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: baseline;
    }
    .meta .row span { color: var(--muted); min-width: 88px; }
    .meta .row strong { color: var(--ink); font-weight: 600; }
    .meta .row strong.brand { color: var(--brand); }
    .meta .row strong.warn { color: var(--warn); }

    h2 {
      font-size: 14.5px;
      color: var(--ink);
      border-right: 4px solid var(--brand);
      padding-right: 10px;
      margin: 14px 0 8px;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
      font-size: 10.5px;
      table-layout: fixed;
    }
    thead th {
      background: var(--ink);
      color: #fff;
      font-weight: 600;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid #111;
      line-height: 1.45;
    }
    tbody td {
      padding: 8px 6px;
      text-align: center;
      border: 1px solid var(--line);
      vertical-align: middle;
      word-wrap: break-word;
      line-height: 1.55;
    }
    tbody tr:nth-child(even) { background: #fcfcfc; }
    tbody td.r { text-align: right; padding-inline: 8px; }
    tbody td.amt {
      color: var(--brand);
      font-weight: 700;
      direction: ltr;
      unicode-bidi: isolate;
      white-space: nowrap;
    }
    tbody td.num {
      white-space: nowrap;
      direction: ltr;
      unicode-bidi: isolate;
    }
    tfoot td {
      background: var(--brand-soft);
      font-weight: 700;
      padding: 8px 6px;
      text-align: center;
      border: 1px solid var(--line);
      color: var(--brand-dark);
    }
    tfoot td.amt {
      color: var(--brand-dark);
      font-size: 12px;
      direction: ltr;
      unicode-bidi: isolate;
    }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      background: var(--brand-soft);
      color: var(--brand-dark);
    }

    .sheet-body { flex: 1 1 auto; }

    .page-num {
      margin-top: 10px;
      padding-top: 10px;
      text-align: center;
      font-size: 10px;
      color: var(--muted);
    }

    .end-footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-size: 10.5px;
      color: var(--muted);
    }
    .end-footer .who {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--ink);
      direction: ltr;
      unicode-bidi: embed;
      margin-bottom: 4px;
    }
    .end-footer .about-title {
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 4px;
    }
    .end-footer .note { margin-top: 4px; font-size: 10px; }

    @media print {
      body { background: none; }
      .sheet { margin: 0; box-shadow: none; width: 210mm; min-height: 297mm; }
      @page { size: A4; margin: 0; }
    }
  `;
}

function endFooterHtml(footerNote?: string): string {
  const note = footerNote
    ? `<div class="note">${rtlHtml(footerNote)}</div>`
    : "";
  return `
    <div class="end-footer">
      <div>
        <div class="who">${DOC_BRAND.nameEn}</div>
        <div>${rtlHtml("عروض أسعار وكشوف مشاريع")}</div>
        <div>${rtlHtml("Personal Finance · مستندات العملاء")}</div>
        ${note}
      </div>
      <div style="text-align:left; direction:ltr;">
        <div class="about-title">About</div>
        <div>Client quotes &amp; project statements.</div>
        <div>Same brand chrome as delivery reports.</div>
      </div>
    </div>`;
}

function wrapDocument(opts: {
  title: string;
  docLabel: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.title)}</title>
  ${docFontLinks()}
  <style>${docStyles()}</style>
</head>
<body>
  <section class="sheet">
    <div class="page-chrome">
      <span class="identity">${DOC_BRAND.nameEn}</span>
      <span class="doc-label">${rtlHtml(opts.docLabel)}</span>
    </div>
    <div class="sheet-body">
      ${opts.bodyHtml}
    </div>
    ${endFooterHtml(opts.footerNote)}
    <div class="page-num">${rtlHtml("صفحة 1")}</div>
  </section>
</body>
</html>`;
}

export type ProposalDocInput = {
  title: string;
  subtitle?: string;
  clientName: string;
  dateLabel: string;
  total: number;
  /** Display currency for line amounts + total (default EGP). */
  currency?: string;
  items: ProjectScopeItem[];
  audience: DocumentAudience;
  /** Internal-only payment summary. */
  collected?: number;
  pending?: number;
  statusLabel?: string;
  issuerName?: string;
  footerNote?: string;
};

export type StatementDocInput = {
  title: string;
  clientName: string;
  dateLabel: string;
  rows: {
    name: string;
    amount: number;
    collected?: number;
    pending?: number;
    statusLabel?: string;
  }[];
  audience?: DocumentAudience;
  issuerName?: string;
  footerNote?: string;
};

export function buildProposalHtml(input: ProposalDocInput): string {
  const isClient = (input.audience ?? "client") === "client";
  const cur = input.currency === "SAR" ? "SAR" : "EGP";
  const items = input.items.length
    ? input.items
    : [{ title: input.title, description: input.subtitle ?? "" }];

  const scopeSum = sumScopeItemAmounts(items);
  const total = scopeSum > 0 ? scopeSum : input.total;
  const totalFmt = formatMoney(total, cur);

  const bodyRows = items
    .map((item, i) => {
      const bits: string[] = [];
      if (item.description) bits.push(rtlHtml(item.description));
      if (!isClient) {
        if (item.tech) bits.push(rtlHtml(item.tech));
        if (item.complexity) bits.push(rtlHtml(COMPLEXITY_AR[item.complexity] ?? item.complexity));
      }
      const meta = bits.length
        ? `<br /><span style="color:${DOC_BRAND.muted};font-size:10px">${bits.join(" · ")}</span>`
        : "";
      const moneyCell = item.amount != null ? formatMoney(item.amount, cur) : "—";
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="r"><strong>${rtlHtml(item.title)}</strong>${meta}</td>
        <td class="amt">${moneyCell}</td>
      </tr>`;
    })
    .join("");

  const paymentMeta =
    !isClient &&
    (input.collected != null || input.pending != null || input.statusLabel)
      ? `
        <div class="row"><span>${rtlHtml("المحصّل")}</span><strong>${formatMoney(input.collected ?? 0, cur)}</strong></div>
        <div class="row"><span>${rtlHtml("المتبقي")}</span><strong>${formatMoney(input.pending ?? 0, cur)}</strong></div>
        <div class="row"><span>${rtlHtml("الحالة")}</span><strong>${rtlHtml(input.statusLabel || "—")}</strong></div>`
      : "";

  const bodyHtml = `
      <div class="doc-head">
        <h1>${rtlHtml(input.title)}</h1>
        ${input.subtitle ? `<div class="sub">${rtlHtml(input.subtitle)}</div>` : ""}
        <div class="byline">${rtlHtml(input.dateLabel)}</div>
      </div>
      <div class="meta">
        <div class="row"><span>${rtlHtml("العميل")}</span><strong>${rtlHtml(input.clientName || "—")}</strong></div>
        <div class="row"><span>${rtlHtml("الإجمالي")}</span><strong class="brand">${totalFmt}</strong></div>
        <div class="row"><span>${rtlHtml("عدد البنود")}</span><strong>${items.length}</strong></div>
        ${paymentMeta}
      </div>
      <h2>${rtlHtml(isClient ? "بنود العرض" : "بنود العرض (داخلي)")}</h2>
      <table>
        <thead><tr><th style="width:8%">#</th><th style="width:66%">${rtlHtml("البند / الوصف")}</th><th style="width:26%">${rtlHtml("المبلغ")}</th></tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td colspan="2">${rtlHtml("الإجمالي")}</td><td class="amt">${totalFmt}</td></tr></tfoot>
      </table>`;

  return wrapDocument({
    title: input.title,
    docLabel: isClient ? "عرض سعر" : "عرض سعر (داخلي)",
    bodyHtml,
    footerNote: input.footerNote,
  });
}

export function buildStatementHtml(input: StatementDocInput): string {
  const isClient = (input.audience ?? "client") === "client";
  const total = input.rows.reduce((s, r) => s + r.amount, 0);
  const totalFmt = formatMoney(total);
  const bodyRows = input.rows
    .map((r, i) => {
      if (isClient) {
        return `<tr><td class="num">${i + 1}</td><td class="r">${rtlHtml(r.name)}</td><td class="amt">${formatMoney(r.amount)}</td></tr>`;
      }
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="r">${rtlHtml(r.name)}</td>
        <td class="amt">${formatMoney(r.amount)}</td>
        <td class="amt">${formatMoney(r.collected ?? 0)}</td>
        <td class="amt">${formatMoney(r.pending ?? 0)}</td>
        <td>${rtlHtml(r.statusLabel ?? "—")}</td>
      </tr>`;
    })
    .join("");

  const headerCols = isClient
    ? `<th style="width:8%">#</th><th>${rtlHtml("المشروع")}</th><th style="width:22%">${rtlHtml("المبلغ")}</th>`
    : `<th style="width:6%">#</th><th>${rtlHtml("المشروع")}</th><th style="width:14%">${rtlHtml("المتفق")}</th><th style="width:14%">${rtlHtml("المحصّل")}</th><th style="width:14%">${rtlHtml("المتبقي")}</th><th style="width:12%">${rtlHtml("الحالة")}</th>`;

  const footColspan = isClient ? 2 : 5;
  const docLabel = isClient ? "كشف حساب مشاريع" : "كشف تفصيلي (داخلي)";

  const bodyHtml = `
      <div class="doc-head">
        <h1>${rtlHtml(input.title)}</h1>
        <div class="sub">${rtlHtml(`كشف مشاريع — ${input.clientName || "عميل"}`)}</div>
        <div class="byline">${rtlHtml(input.dateLabel)}</div>
      </div>
      <div class="meta">
        <div class="row"><span>${rtlHtml("العميل")}</span><strong>${rtlHtml(input.clientName || "—")}</strong></div>
        <div class="row"><span>${rtlHtml("عدد المشاريع")}</span><strong>${input.rows.length}</strong></div>
        <div class="row"><span>${rtlHtml("الإجمالي")}</span><strong class="brand">${totalFmt}</strong></div>
      </div>
      <h2>${rtlHtml(isClient ? "المشاريع" : "التفاصيل")}</h2>
      <table>
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td colspan="${footColspan}">${rtlHtml("الإجمالي")}</td><td class="amt">${totalFmt}</td></tr></tfoot>
      </table>`;

  return wrapDocument({
    title: input.title,
    docLabel,
    bodyHtml,
    footerNote: input.footerNote ?? docLabel,
  });
}

export type InvoiceDocInput = {
  invoiceNumber: string;
  dateLabel: string;
  clientName: string;
  projectName: string;
  currency?: string;
  lines: {
    title: string;
    description?: string;
    amount: number;
  }[];
  payments: {
    description: string;
    date: string;
    amount: number;
    collected: boolean;
  }[];
  footerNote?: string;
};

/** Client invoice layout based on templates/invoice.html. All amounts are book-value EGP. */
export function buildInvoiceHtml(input: InvoiceDocInput): string {
  const currency = input.currency ?? "EGP";
  const total = input.lines.reduce((sum, line) => sum + Math.max(0, line.amount), 0);
  const collected = input.payments
    .filter((payment) => payment.collected)
    .reduce((sum, payment) => sum + Math.max(0, payment.amount), 0);
  const outstanding = Math.max(0, total - collected);
  const money = (amount: number) => formatMoney(amount, currency);
  const lineRows = input.lines.length
    ? input.lines
        .map(
          (line, index) => `<tr>
            <td class="c">${index + 1}</td>
            <td><div class="item-title">${rtlHtml(line.title)}</div>${line.description ? `<div class="item-sub">${rtlHtml(line.description)}</div>` : ""}</td>
            <td class="amt">${money(line.amount)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td class="c">1</td><td><div class="item-title">${rtlHtml(input.projectName)}</div></td><td class="amt">${money(0)}</td></tr>`;
  const paymentRows = input.payments.length
    ? input.payments
        .map(
          (payment) => `<tr>
            <td class="r">${rtlHtml(payment.description)}</td>
            <td class="c">${rtlHtml(payment.date)}</td>
            <td class="c"><span class="status ${payment.collected ? "paid" : "due"}">${rtlHtml(payment.collected ? "مدفوع" : "مستحق")}</span></td>
            <td class="amt">${money(payment.amount)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td class="r" colspan="4">${rtlHtml("لا توجد دفعات مسجلة حتى الآن")}</td></tr>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(`فاتورة | ${input.projectName}`)}</title>
  ${docFontLinks()}
  <style>
    :root { --brand:#4E45E4; --brand-dark:#4237CA; --ink:#1A1A1A; --muted:#6B7280; --line:#E5E7EB; --bg:#FAFAFA; --white:#fff; --paid:#047857; --due:#B45309; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:#ececec; font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif; color:var(--ink); font-size:13px; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .sheet { width:210mm; min-height:297mm; margin:16px auto; background:var(--white); box-shadow:0 4px 24px rgba(0,0,0,.08); display:flex; flex-direction:column; padding:16mm 16mm 14mm; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:14px; border-bottom:2px solid var(--brand); }
    .brand .who { font-size:20px; font-weight:700; letter-spacing:.04em; direction:ltr; text-align:right; }
    .brand .role { font-size:11px; color:var(--muted); margin-top:2px; }
    .brand .contact { margin-top:10px; font-size:11px; color:#555; direction:ltr; text-align:right; line-height:1.7; }
    .meta { text-align:left; direction:ltr; min-width:200px; }
    .meta .doc-type { font-size:11px; font-weight:700; letter-spacing:.14em; color:var(--brand); margin-bottom:6px; }
    .meta .num { font-size:18px; font-weight:700; color:var(--ink); margin-bottom:8px; }
    .meta .row { font-size:11.5px; color:var(--muted); margin-bottom:3px; }
    .meta .row strong { color:var(--ink); font-weight:600; }
    .parties { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:18px 0 20px; }
    .party .lbl { font-size:10px; font-weight:700; letter-spacing:.04em; color:var(--muted); margin-bottom:6px; }
    .party .name { font-size:15px; font-weight:700; margin-bottom:4px; }
    .party .detail { font-size:12px; color:#555; line-height:1.65; }
    h2 { font-size:12px; font-weight:700; color:var(--ink); margin:0 0 10px; letter-spacing:.02em; }
    table.items, table.payments { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:18px; }
    table.items thead th, table.payments thead th { background:var(--bg); border-top:1px solid var(--line); border-bottom:1px solid var(--line); color:#374151; font-weight:700; padding:10px 12px; text-align:center; font-size:11px; }
    table.items tbody td, table.payments tbody td { padding:12px; border-bottom:1px solid var(--line); vertical-align:top; text-align:right; }
    table.items td.c, table.payments td.c { text-align:center; color:#555; }
    table.items td.amt, table.payments td.amt { text-align:center; direction:ltr; unicode-bidi:embed; font-weight:700; white-space:nowrap; }
    .item-title { font-weight:700; margin-bottom:5px; }
    .item-sub { font-size:11px; color:var(--muted); line-height:1.65; white-space:pre-line; }
    .payments td.r { text-align:right; }
    .status { display:inline-block; border-radius:999px; padding:2px 9px; font-size:10px; font-weight:700; }
    .status.paid { color:var(--paid); background:#ECFDF5; }
    .status.due { color:var(--due); background:#FFFBEB; }
    .pay { border:1px solid var(--line); margin-bottom:14px; }
    .pay-head { background:var(--bg); border-bottom:1px solid var(--line); padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .pay-head strong { font-size:12px; color:var(--ink); }
    .pay-head span { font-size:11px; color:var(--muted); }
    .pay-body { padding:4px 14px 8px; }
    .pay-row { display:grid; grid-template-columns:140px 1fr; gap:8px; align-items:baseline; padding:9px 0; border-bottom:1px solid #F0F0F0; }
    .pay-row:last-child { border-bottom:none; }
    .pay-row .k { font-size:11px; color:var(--muted); font-weight:600; }
    .pay-row .v { font-size:13px; font-weight:700; direction:ltr; unicode-bidi:embed; word-break:break-all; }
    .totals { width:100%; margin-bottom:8px; }
    .sum-box { width:100%; border:1px solid var(--line); }
    .sum-row { display:flex; justify-content:space-between; align-items:center; padding:10px 14px; font-size:12px; border-bottom:1px solid var(--line); }
    .sum-row:last-child { border-bottom:none; }
    .sum-row .k { color:var(--muted); }
    .sum-row .v { direction:ltr; unicode-bidi:embed; font-weight:600; }
    .sum-row.grand { background:var(--ink); color:#fff; padding:14px; }
    .sum-row.grand .k { color:rgba(255,255,255,.85); font-weight:600; font-size:13px; }
    .sum-row.grand .v { color:#fff; font-size:22px; font-weight:700; }
    .body { flex:1; }
    .foot { margin-top:auto; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; gap:12px; font-size:10.5px; color:var(--muted); }
    .foot .thanks { color:var(--ink); font-weight:600; font-size:12px; margin-bottom:2px; }
    .foot .brand-mini { font-weight:700; letter-spacing:.04em; color:var(--ink); direction:ltr; margin-bottom:2px; }
    @page { size:A4; margin:0; }
    @media print { body{background:#fff;} .sheet{margin:0; box-shadow:none; width:210mm; min-height:297mm;} }
    @media screen and (max-width:850px) { .sheet{zoom:.65; margin:12px auto;} }
  </style>
</head>
<body>
  <section class="sheet">
    <div class="body">
      <div class="top">
        <div class="brand"><div class="who">MAHMOUD SAEED</div><div class="role">خدمات تقنية</div><div class="contact">01120847850<br />mahmoudsaeed0112074@gmail.com</div></div>
        <div class="meta"><div class="doc-type">INVOICE</div><div class="num">${esc(input.invoiceNumber)}</div><div class="row">Date: <strong>${esc(input.dateLabel)}</strong></div><div class="row">Project: <strong>${esc(input.projectName)}</strong></div></div>
      </div>
      <div class="parties"><div class="party"><div class="lbl">من</div><div class="name">محمود سعيد</div><div class="detail"><span dir="ltr">MAHMOUD SAEED MOHAMED MAHMOUD</span></div></div><div class="party"><div class="lbl">فاتورة إلى</div><div class="name">${rtlHtml(input.clientName || "اسم العميل")}</div></div></div>
      <h2>تفاصيل الخدمات والتعديلات</h2>
      <table class="items"><thead><tr><th style="width:8%">#</th><th>البند والتفاصيل</th><th style="width:24%">المبلغ</th></tr></thead><tbody>${lineRows}</tbody></table>
      <h2>حالة الدفعات</h2>
      <table class="payments"><thead><tr><th>البيان</th><th style="width:20%">التاريخ</th><th style="width:18%">الحالة</th><th style="width:22%">المبلغ</th></tr></thead><tbody>${paymentRows}</tbody></table>
      <div class="pay"><div class="pay-head"><strong>بيانات التحويل البنكي</strong><span>يُرجى التحويل ثم إرسال صورة الإيصال</span></div><div class="pay-body"><div class="pay-row"><div class="k">اسم المستفيد</div><div class="v">MAHMOUD SAEED MOHAMED MAHMOUD</div></div><div class="pay-row"><div class="k">IBAN</div><div class="v">EG97 0025 0040 0000 0040 1602 2800 1</div></div><div class="pay-row"><div class="k">Soft Code</div><div class="v">ebbkegcx</div></div></div></div>
      <div class="totals"><div class="sum-box"><div class="sum-row"><span class="k">إجمالي الفاتورة</span><span class="v">${money(total)}</span></div><div class="sum-row"><span class="k">المدفوع حتى الآن</span><span class="v">${money(collected)}</span></div><div class="sum-row grand"><span class="k">المتبقي المستحق</span><span class="v">${money(outstanding)}</span></div></div></div>
    </div>
    <footer class="foot"><div><div class="thanks">شكرًا لتعاملكم</div><div>للاستفسار: 01120847850</div>${input.footerNote ? `<div>${rtlHtml(input.footerNote)}</div>` : ""}</div><div style="text-align:left;direction:ltr"><div class="brand-mini">MAHMOUD SAEED</div><div>${esc(input.invoiceNumber)} · Page 1 of 1</div></div></footer>
  </section>
</body>
</html>`;
}
