import { formatMoney } from "@/lib/format";
import type { ProjectScopeItem, ScopeComplexity } from "@/lib/project-scope";

export type DocumentAudience = "client" | "internal";

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
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=block" rel="stylesheet" />
  `;
}

function docStyles(): string {
  return `
    :root { --indigo:#4f46e5; --indigo-dark:#4338ca; --obsidian:#06070b; --muted:#6b7280; --border:#e5e7eb; --surface:#f9fafb; }
    @page { size:A4; margin:16mm; }
    * { box-sizing:border-box; }
    html { direction:rtl; }
    body {
      font-family:"Noto Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;
      color:var(--obsidian);
      line-height:1.75;
      margin:0;
      padding:0;
      background:#fff;
      letter-spacing:0;
      word-spacing:0;
      font-synthesis:none;
      text-rendering:geometricPrecision;
      -webkit-font-smoothing:antialiased;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }
    .page { max-width:210mm; margin:0 auto; padding:12px 16px 28px; }
    .top-bar { height:4px; background:linear-gradient(90deg,var(--indigo),var(--indigo-dark)); border-radius:2px; margin-bottom:24px; }
    .doc-head {
      display:grid;
      grid-template-columns:1fr auto;
      gap:16px;
      align-items:start;
      margin-bottom:22px;
    }
    .doc-head h1 {
      font-size:22px;
      font-weight:700;
      margin:0 0 8px;
      line-height:1.5;
      letter-spacing:0;
      word-break:break-word;
    }
    .doc-head .sub { color:var(--muted); font-size:13px; margin:0; font-weight:500; line-height:1.6; }
    .doc-date {
      text-align:start;
      font-size:11px;
      color:var(--muted);
      white-space:nowrap;
      padding-top:6px;
      direction:ltr;
      unicode-bidi:isolate;
    }
    .meta {
      background:var(--surface);
      border:1px solid var(--border);
      border-right:4px solid var(--indigo);
      border-radius:10px;
      padding:16px 20px;
      margin-bottom:26px;
      font-size:13px;
    }
    .meta-row {
      display:grid;
      grid-template-columns:92px 1fr;
      gap:10px;
      align-items:baseline;
      margin-bottom:8px;
    }
    .meta-row:last-child { margin-bottom:0; }
    .meta-label { color:var(--muted); font-weight:500; line-height:1.6; }
    .meta-value { color:var(--obsidian); font-weight:600; line-height:1.6; word-break:break-word; }
    .meta-value.highlight { color:var(--indigo); font-size:15px; }
    table { width:100%; border-collapse:collapse; font-size:11.5px; table-layout:fixed; }
    thead th {
      background:var(--obsidian);
      color:#fff;
      padding:12px 10px;
      font-weight:600;
      font-size:11px;
      line-height:1.55;
      letter-spacing:0;
      word-wrap:break-word;
    }
    thead th:first-child { border-radius:0 6px 0 0; }
    thead th:last-child { border-radius:6px 0 0 0; }
    tbody td {
      border:1px solid var(--border);
      padding:11px 10px;
      vertical-align:top;
      line-height:1.65;
      word-wrap:break-word;
    }
    tbody tr:nth-child(even) { background:#fafafa; }
    .num { text-align:center; white-space:nowrap; direction:ltr; unicode-bidi:isolate; }
    .money {
      font-weight:700;
      color:var(--indigo);
      text-align:center;
      font-size:12px;
      direction:ltr;
      unicode-bidi:isolate;
      white-space:nowrap;
    }
    tfoot td { background:#f3f4f6; font-weight:700; border:1px solid #d1d5db; padding:13px 10px; font-size:12px; line-height:1.5; }
    tfoot .money { font-size:14px; color:var(--indigo-dark); }
    .badge { display:inline-block; padding:3px 9px; border-radius:6px; font-size:10px; font-weight:600; line-height:1.4; }
    .high { background:#eef2ff; color:#3730a3; }
    .mid { background:#f5f3ff; color:#5b21b6; }
    .low { background:#f0fdf4; color:#166534; }
    .footer {
      margin-top:32px;
      padding-top:14px;
      border-top:1px solid var(--border);
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      font-size:10.5px;
      color:#9ca3af;
      line-height:1.6;
    }
    .footer-name { font-weight:600; color:var(--obsidian); letter-spacing:0; text-transform:none; font-size:11px; }
    @media print { .page { padding:0; } }
  `;
}

function complexityBadge(c?: ScopeComplexity): string {
  if (!c) return "—";
  const cls = c === "high" ? "high" : c === "mid" ? "mid" : "low";
  return `<span class="badge ${cls}">${esc(COMPLEXITY_AR[c])}</span>`;
}

function pct(amount: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((amount / total) * 100)}%`;
}

export type ProposalDocInput = {
  title: string;
  subtitle?: string;
  clientName: string;
  dateLabel: string;
  total: number;
  items: ProjectScopeItem[];
  audience: DocumentAudience;
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
  const isClient = input.audience === "client";
  const totalFmt = formatMoney(input.total);
  const items = input.items.length
    ? input.items
    : [{ title: input.title, description: input.subtitle ?? "" }];

  const headerCols = isClient
    ? `<th style="width:4%">#</th><th style="width:96%">البند / الوصف</th>`
    : `<th style="width:4%">#</th><th style="width:34%">البند / الوصف</th><th style="width:14%">التقنية</th><th style="width:12%">التعقيد</th><th style="width:10%">النسبة</th><th style="width:12%">المبلغ</th>`;

  const bodyRows = items
    .map((item, i) => {
      const desc = item.description ? `<br />${esc(item.description)}` : "";
      if (isClient) {
        return `<tr><td class="num">${i + 1}</td><td><strong>${esc(item.title)}</strong>${desc}</td></tr>`;
      }
      const amt = item.amount ?? 0;
      return `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(item.title)}</strong>${desc}</td>
        <td class="num">${esc(item.tech || "—")}</td>
        <td class="num">${complexityBadge(item.complexity)}</td>
        <td class="num">${item.amount != null ? pct(amt, input.total) : "—"}</td>
        <td class="money">${item.amount != null ? formatMoney(amt) : "—"}</td>
      </tr>`;
    })
    .join("");

  const footColspan = isClient ? 1 : 5;
  const docKind = isClient ? "عرض / Proposal" : "تقرير توزيع داخلي";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${esc(input.title)}</title>
  ${docFontLinks()}
  <style>${docStyles()}</style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    <div class="doc-head">
      <div>
        <h1>${esc(input.title)}</h1>
        ${input.subtitle ? `<p class="sub">${esc(input.subtitle)}</p>` : ""}
      </div>
      <div class="doc-date">${esc(input.dateLabel)}</div>
    </div>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">العميل</span><span class="meta-value">${esc(input.clientName || "—")}</span></div>
      <div class="meta-row"><span class="meta-label">النوع</span><span class="meta-value">${docKind}</span></div>
      <div class="meta-row"><span class="meta-label">الإجمالي</span><span class="meta-value highlight">${totalFmt}</span></div>
      <div class="meta-row"><span class="meta-label">عدد البنود</span><span class="meta-value">${items.length}</span></div>
    </div>
    <table>
      <thead><tr>${headerCols}</tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr><td colspan="${footColspan}" style="text-align:center">الإجمالي</td><td class="money">${totalFmt}</td></tr></tfoot>
    </table>
    <div class="footer">
      <span class="footer-name">${esc(input.issuerName ?? "Mahmoud Saeed")}</span>
      <span>${esc(input.footerNote ?? docKind)}</span>
    </div>
  </div>
</body>
</html>`;
}

export function buildStatementHtml(input: StatementDocInput): string {
  const isClient = (input.audience ?? "client") === "client";
  const total = input.rows.reduce((s, r) => s + r.amount, 0);
  const totalFmt = formatMoney(total);
  const bodyRows = input.rows
    .map((r, i) => {
      if (isClient) {
        return `<tr><td class="num">${i + 1}</td><td>${esc(r.name)}</td><td class="money">${formatMoney(r.amount)}</td></tr>`;
      }
      return `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(r.name)}</td>
        <td class="money">${formatMoney(r.amount)}</td>
        <td class="money">${formatMoney(r.collected ?? 0)}</td>
        <td class="money">${formatMoney(r.pending ?? 0)}</td>
        <td class="num">${esc(r.statusLabel ?? "—")}</td>
      </tr>`;
    })
    .join("");

  const headerCols = isClient
    ? `<th style="width:4%">#</th><th>المشروع</th><th style="width:18%">المبلغ</th>`
    : `<th style="width:4%">#</th><th>المشروع</th><th style="width:14%">المتفق</th><th style="width:14%">المحصّل</th><th style="width:14%">المتبقي</th><th style="width:12%">الحالة</th>`;

  const footColspan = isClient ? 2 : 5;
  const docKind = isClient ? "كشف حساب مشاريع" : "كشف تفصيلي (داخلي)";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${esc(input.title)}</title>
  ${docFontLinks()}
  <style>${docStyles()}</style>
</head>
<body>
  <div class="page">
    <div class="top-bar"></div>
    <div class="doc-head">
      <div><h1>${esc(input.title)}</h1><p class="sub">كشف مشاريع — ${esc(input.clientName || "عميل")}</p></div>
      <div class="doc-date">${esc(input.dateLabel)}</div>
    </div>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">العميل</span><span class="meta-value">${esc(input.clientName || "—")}</span></div>
      <div class="meta-row"><span class="meta-label">عدد المشاريع</span><span class="meta-value">${input.rows.length}</span></div>
      <div class="meta-row"><span class="meta-label">الإجمالي</span><span class="meta-value highlight">${totalFmt}</span></div>
    </div>
    <table>
      <thead><tr>${headerCols}</tr></thead>
      <tbody>${bodyRows}</tbody>
      <tfoot><tr><td colspan="${footColspan}" style="text-align:center">الإجمالي</td><td class="money">${totalFmt}</td></tr></tfoot>
    </table>
    <div class="footer">
      <span class="footer-name">${esc(input.issuerName ?? "Mahmoud Saeed")}</span>
      <span>${esc(input.footerNote ?? docKind)}</span>
    </div>
  </div>
</body>
</html>`;
}
