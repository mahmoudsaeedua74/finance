import mongoose from "mongoose";
import { Expense, FreelanceProject, Income, Invoice } from "@/lib/models";
import { listNormalBillingGroups } from "@/lib/services/invoice-service";
import {
  COLLECTION_ATTENTION_KINDS,
  getProjectAttentionItems,
} from "@/lib/services/project-attention-service";
import { buildLedgerReport } from "@/lib/build-ledger-report";
import { roundMoney } from "@/lib/currency";
import { formatMoney } from "@/lib/format";

function money(n: number) {
  return formatMoney(roundMoney(n));
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    normal: "Normal",
    css: "CSS",
    sdk: "SDK",
    frontend: "Frontend",
    backend: "Backend",
    "full-stack": "Full-stack",
  };
  return map[type] ?? type;
}

export async function buildLocalProjectsInsights(
  userId: string,
  locale: "ar" | "en"
): Promise<string> {
  const uid = new mongoose.Types.ObjectId(userId);
  const ar = locale === "ar";

  const [groups, openInvoices, attention, byType] = await Promise.all([
    listNormalBillingGroups(userId),
    Invoice.find({ userId: uid, status: { $in: ["draft", "issued"] } })
      .select("clientName totalEgp jobIds")
      .lean(),
    getProjectAttentionItems(userId, "collections"),
    FreelanceProject.aggregate([
      {
        $match: {
          userId: uid,
          isArchived: { $ne: true },
          status: { $nin: ["cancelled", "collected"] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$projectType", "normal"] },
          count: { $sum: 1 },
          agreedEgp: { $sum: "$agreedAmount" },
        },
      },
      { $sort: { agreedEgp: -1 } },
    ]),
  ]);

  const withClient = groups.filter((g) => g.hasClient).sort((a, b) => b.count - a.count);
  const noClientCount = groups.filter((g) => !g.hasClient).reduce((s, g) => s + g.count, 0);
  const normalJobs = withClient.reduce((s, g) => s + g.count, 0);
  const normalPoolEgp = roundMoney(withClient.reduce((s, g) => s + g.totalEgp, 0));
  /** Money you could put on invoices right now if you bill the suggested ~10 per client. */
  const invoiceableNowEgp = roundMoney(
    withClient.reduce((s, g) => s + g.suggestTotalEgp, 0)
  );

  const collectionKinds = new Set(COLLECTION_ATTENTION_KINDS);
  const unpaid = attention.filter((i) => collectionKinds.has(i.kind));
  const unpaidEgp = roundMoney(unpaid.reduce((s, i) => s + (i.amount ?? 0), 0));
  const unpaidJobs = new Set(unpaid.map((i) => i.jobId)).size;

  const byClientPending = new Map<string, number>();
  for (const i of unpaid) {
    const name = (i.clientName || "").trim() || (ar ? "بدون اسم" : "No name");
    byClientPending.set(name, roundMoney((byClientPending.get(name) ?? 0) + (i.amount ?? 0)));
  }
  const topPending = Array.from(byClientPending.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const openInvEgp = roundMoney(openInvoices.reduce((s, i) => s + (i.totalEgp ?? 0), 0));
  const lines: string[] = [];

  // —— Snapshot ——
  lines.push(ar ? "📊 صورة سريعة" : "📊 Snapshot");
  lines.push(
    ar
      ? `• Normal جاهز للتجميع: ${normalJobs} مشروع = ${money(normalPoolEgp)}`
      : `• Normal ready to group: ${normalJobs} jobs = ${money(normalPoolEgp)}`
  );
  lines.push(
    ar
      ? `• لو عملت فاتورة بالـ ~10 المقترحة دلوقتي: حوالي ${money(invoiceableNowEgp)}`
      : `• If you invoice the suggested ~10 now: about ${money(invoiceableNowEgp)}`
  );
  lines.push(
    ar
      ? `• فلوس لسه متتحصّلتش: ${money(unpaidEgp)} على ${unpaidJobs} مشروع`
      : `• Still uncollected: ${money(unpaidEgp)} across ${unpaidJobs} jobs`
  );
  if (openInvoices.length) {
    lines.push(
      ar
        ? `• فواتير مفتوحة: ${openInvoices.length} مجموعها ${money(openInvEgp)}`
        : `• Open invoices: ${openInvoices.length} totaling ${money(openInvEgp)}`
    );
  }

  // —— Invoice priority ——
  lines.push("");
  lines.push(ar ? "✅ أولوية الفاتورة (Normal)" : "✅ Invoice priority (Normal)");

  const ready = withClient.filter((g) => g.count >= 10);
  const warming = withClient.filter((g) => g.count > 0 && g.count < 10);

  if (ready.length) {
    for (const g of ready.slice(0, 4)) {
      const left = g.count - g.suggestCount;
      if (ar) {
        const priceBit =
          g.samePrice && g.unitAmount != null
            ? ` × ${money(g.unitAmount)}`
            : "";
        lines.push(
          `• «${g.clientName}»: ${g.count} مشروع${priceBit} → لمّ ${g.suggestCount} = ${money(g.suggestTotalEgp)}${left > 0 ? ` (يفضل ${left})` : ""}`
        );
      } else {
        const priceBit =
          g.samePrice && g.unitAmount != null ? ` × ${money(g.unitAmount)}` : "";
        lines.push(
          `• “${g.clientName}”: ${g.count} jobs${priceBit} → pick ${g.suggestCount} = ${money(g.suggestTotalEgp)}${left > 0 ? ` (${left} left)` : ""}`
        );
      }
    }
    lines.push(
      ar
        ? "→ افتح تجميع الـ Normal فوق، اختَر العميل، اعمل فاتورة."
        : "→ Open Normal billing above, pick the client, create the invoice."
    );
  } else if (warming.length) {
    const top = warming[0];
    lines.push(
      ar
        ? `• أقرب عميل: «${top.clientName}» — ${top.count}/10 مشروع = ${money(top.totalEgp)}. تقدر تعمل فاتورة دلوقتي بأي عدد.`
        : `• Closest: “${top.clientName}” — ${top.count}/10 jobs = ${money(top.totalEgp)}. You can invoice any count now.`
    );
  } else {
    lines.push(
      ar
        ? "• مفيش Normal جاهز باسم عميل دلوقتي."
        : "• No Normal jobs ready with a client name."
    );
  }

  if (noClientCount > 0) {
    lines.push(
      ar
        ? `⚠ ${noClientCount} مشروع من غير اسم عميل — حط الاسم عشان يدخلوا التجميع.`
        : `⚠ ${noClientCount} jobs have no client name — add names so they can be grouped.`
    );
  }

  // —— Collection priority ——
  if (unpaidEgp > 0.5 && topPending.length) {
    lines.push("");
    lines.push(ar ? "💰 أولوية التحصيل" : "💰 Collection priority");
    for (const [name, amt] of topPending) {
      lines.push(ar ? `• «${name}»: ${money(amt)}` : `• “${name}”: ${money(amt)}`);
    }
    lines.push(
      ar
        ? "→ صفحة التحصيل تورّيك التفاصيل مشروع بمشروع."
        : "→ Collections page shows this job by job."
    );
  }

  // —— Work mix (compact) ——
  if (byType.length > 1) {
    lines.push("");
    lines.push(ar ? "📁 توزيع الشغل النشط" : "📁 Active work mix");
    lines.push(
      byType
        .slice(0, 4)
        .map(
          (r: { _id: string; count: number; agreedEgp: number }) =>
            `${typeLabel(String(r._id))}: ${r.count} · ${money(r.agreedEgp)}`
        )
        .join(ar ? "  |  " : "  |  ")
    );
  }

  return lines.join("\n");
}

export async function buildLocalFinanceInsights(
  userId: string,
  surface: "transactions" | "reports",
  locale: "ar" | "en"
): Promise<string> {
  const uid = new mongoose.Types.ObjectId(userId);
  const ar = locale === "ar";
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const [ledger, expenses, incomes] = await Promise.all([
    buildLedgerReport(userId),
    Expense.find({ userId: uid, isTemplate: false, date: { $gte: since } })
      .select("title amount category date")
      .lean(),
    Income.find({ userId: uid, date: { $gte: since } })
      .select("title amount category date")
      .lean(),
  ]);

  const byCat = new Map<string, number>();
  for (const e of expenses) {
    const cat = (e.category || "general").trim() || "general";
    byCat.set(cat, roundMoney((byCat.get(cat) ?? 0) + e.amount));
  }
  const topCats = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
  const expenseTotal = roundMoney(expenses.reduce((s, e) => s + e.amount, 0));
  const incomeTotal = roundMoney(incomes.reduce((s, i) => s + i.amount, 0));
  const net3 = roundMoney(incomeTotal - expenseTotal);

  const lines: string[] = [];

  lines.push(ar ? "📊 آخر 3 شهور" : "📊 Last ~3 months");
  lines.push(
    ar
      ? `• دخل ${money(incomeTotal)} · صرف ${money(expenseTotal)} · صافي ${money(net3)}`
      : `• Income ${money(incomeTotal)} · Spend ${money(expenseTotal)} · Net ${money(net3)}`
  );
  lines.push(
    ar
      ? `• من أول التسجيل: صافي ${money(ledger.summary.netBalance)} (منها مشاريع ${money(ledger.summary.projectIncome)})`
      : `• All time net ${money(ledger.summary.netBalance)} (projects ${money(ledger.summary.projectIncome)})`
  );

  if (topCats.length) {
    lines.push("");
    lines.push(ar ? "💸 أكبر صرف" : "💸 Biggest spend");
    for (const [cat, amt] of topCats.slice(0, 3)) {
      const pct = expenseTotal > 0 ? Math.round((amt / expenseTotal) * 100) : 0;
      lines.push(
        ar
          ? `• «${cat}»: ${money(amt)} (${pct}%)`
          : `• “${cat}”: ${money(amt)} (${pct}%)`
      );
    }
  } else {
    lines.push(
      ar
        ? "• مفيش مصروفات كافية في آخر 3 شهور."
        : "• Not enough expenses in the last 3 months."
    );
  }

  if (surface === "transactions") {
    lines.push("");
    lines.push(ar ? "✅ اقتراح" : "✅ Tip");
    if (net3 < 0) {
      lines.push(
        ar
          ? "• الصافي سالب — ركّز على التحصيل وقلّل أكبر بند صرف فوق."
          : "• Net is negative — chase collections and cut the top spend category."
      );
    } else if (incomeTotal > 0 && expenseTotal / incomeTotal > 0.7) {
      lines.push(
        ar
          ? "• الصرف أكتر من 70% من الدخل — حوش 10% من كل دفعة مشروع أول ما توصل."
          : "• Spending is over 70% of income — save 10% of each project payment."
      );
    } else {
      lines.push(
        ar
          ? "• الوضع مستقر — حط مبلغ ثابت شهري من أرباح المشاريع."
          : "• Looking stable — set a fixed monthly save from project profit."
      );
    }

    const big = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
    if (big.length) {
      lines.push(
        ar
          ? `• أكبر فواتير صرف: ${big.map((e) => `«${e.title}» ${money(e.amount)}`).join("، ")}`
          : `• Largest expenses: ${big.map((e) => `“${e.title}” ${money(e.amount)}`).join(", ")}`
      );
    }
  }

  if (surface === "reports") {
    if (ledger.summary.projectIncome > 0 && ledger.summary.totalIncome > 0) {
      const pct = Math.round(
        (ledger.summary.projectIncome / ledger.summary.totalIncome) * 100
      );
      lines.push("");
      lines.push(
        ar
          ? `📁 دخل المشاريع ≈ ${pct}% من كل دخلك.`
          : `📁 Project income ≈ ${pct}% of all income.`
      );
    }
    lines.push(
      ar
        ? "✅ لو عميل واحد ماسك أغلب الـ Normal — ابدأ بفاتورته من صفحة المشاريع."
        : "✅ If one client holds most Normal work — start their invoice on Projects."
    );
  }

  return lines.join("\n");
}
