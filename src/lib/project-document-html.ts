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
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
    }

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
      word-break: break-word;
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
    ? `<div class="note">${esc(footerNote)}</div>`
    : "";
  return `
    <div class="end-footer">
      <div>
        <div class="who">${DOC_BRAND.nameEn}</div>
        <div>عروض أسعار وكشوف مشاريع</div>
        <div>Personal Finance · مستندات العملاء</div>
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
      <span class="doc-label">${esc(opts.docLabel)}</span>
    </div>
    <div class="sheet-body">
      ${opts.bodyHtml}
    </div>
    ${endFooterHtml(opts.footerNote)}
    <div class="page-num">صفحة 1</div>
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
      if (item.description) bits.push(esc(item.description));
      if (!isClient) {
        if (item.tech) bits.push(esc(item.tech));
        if (item.complexity) bits.push(COMPLEXITY_AR[item.complexity] ?? item.complexity);
      }
      const meta = bits.length
        ? `<br /><span style="color:${DOC_BRAND.muted};font-size:10px">${bits.join(" · ")}</span>`
        : "";
      const moneyCell = item.amount != null ? formatMoney(item.amount, cur) : "—";
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="r"><strong>${esc(item.title)}</strong>${meta}</td>
        <td class="amt">${moneyCell}</td>
      </tr>`;
    })
    .join("");

  const paymentMeta =
    !isClient &&
    (input.collected != null || input.pending != null || input.statusLabel)
      ? `
        <div class="row"><span>المحصّل</span><strong>${formatMoney(input.collected ?? 0, cur)}</strong></div>
        <div class="row"><span>المتبقي</span><strong>${formatMoney(input.pending ?? 0, cur)}</strong></div>
        <div class="row"><span>الحالة</span><strong>${esc(input.statusLabel || "—")}</strong></div>`
      : "";

  const bodyHtml = `
      <div class="doc-head">
        <h1>${esc(input.title)}</h1>
        ${input.subtitle ? `<div class="sub">${esc(input.subtitle)}</div>` : ""}
        <div class="byline">${esc(input.dateLabel)}</div>
      </div>
      <div class="meta">
        <div class="row"><span>العميل</span><strong>${esc(input.clientName || "—")}</strong></div>
        <div class="row"><span>الإجمالي</span><strong class="brand">${totalFmt}</strong></div>
        <div class="row"><span>عدد البنود</span><strong>${items.length}</strong></div>
        ${paymentMeta}
      </div>
      <h2>${isClient ? "بنود العرض" : "بنود العرض (داخلي)"}</h2>
      <table>
        <thead><tr><th style="width:8%">#</th><th style="width:66%">البند / الوصف</th><th style="width:26%">المبلغ</th></tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td colspan="2">الإجمالي</td><td class="amt">${totalFmt}</td></tr></tfoot>
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
        return `<tr><td class="num">${i + 1}</td><td class="r">${esc(r.name)}</td><td class="amt">${formatMoney(r.amount)}</td></tr>`;
      }
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="r">${esc(r.name)}</td>
        <td class="amt">${formatMoney(r.amount)}</td>
        <td class="amt">${formatMoney(r.collected ?? 0)}</td>
        <td class="amt">${formatMoney(r.pending ?? 0)}</td>
        <td class="num">${esc(r.statusLabel ?? "—")}</td>
      </tr>`;
    })
    .join("");

  const headerCols = isClient
    ? `<th style="width:8%">#</th><th>المشروع</th><th style="width:22%">المبلغ</th>`
    : `<th style="width:6%">#</th><th>المشروع</th><th style="width:14%">المتفق</th><th style="width:14%">المحصّل</th><th style="width:14%">المتبقي</th><th style="width:12%">الحالة</th>`;

  const footColspan = isClient ? 2 : 5;
  const docLabel = isClient ? "كشف حساب مشاريع" : "كشف تفصيلي (داخلي)";

  const bodyHtml = `
      <div class="doc-head">
        <h1>${esc(input.title)}</h1>
        <div class="sub">كشف مشاريع — ${esc(input.clientName || "عميل")}</div>
        <div class="byline">${esc(input.dateLabel)}</div>
      </div>
      <div class="meta">
        <div class="row"><span>العميل</span><strong>${esc(input.clientName || "—")}</strong></div>
        <div class="row"><span>عدد المشاريع</span><strong>${input.rows.length}</strong></div>
        <div class="row"><span>الإجمالي</span><strong class="brand">${totalFmt}</strong></div>
      </div>
      <h2>${isClient ? "المشاريع" : "التفاصيل"}</h2>
      <table>
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td colspan="${footColspan}">الإجمالي</td><td class="amt">${totalFmt}</td></tr></tfoot>
      </table>`;

  return wrapDocument({
    title: input.title,
    docLabel,
    bodyHtml,
    footerNote: input.footerNote ?? docLabel,
  });
}
