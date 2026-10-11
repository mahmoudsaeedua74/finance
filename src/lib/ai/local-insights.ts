import mongoose from "mongoose";
import { Expense, FreelanceProject, Income } from "@/lib/models";
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

  const [attention, byType, activeCount] = await Promise.all([
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
    FreelanceProject.countDocuments({
      userId: uid,
      isArchived: { $ne: true },
      status: { $nin: ["cancelled", "collected"] },
    }),
  ]);

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

  const lines: string[] = [];

  lines.push(ar ? "📊 صورة سريعة" : "📊 Snapshot");
  lines.push(
    ar
      ? `• مشاريع نشطة: ${activeCount}`
      : `• Active projects: ${activeCount}`
  );
  lines.push(
    ar
      ? `• فلوس لسه متتحصّلتش: ${money(unpaidEgp)} على ${unpaidJobs} مشروع`
      : `• Still uncollected: ${money(unpaidEgp)} across ${unpaidJobs} jobs`
  );

  if (unpaidEgp > 0.5 && topPending.length) {
    lines.push("");
    lines.push(ar ? "💰 أولوية التحصيل" : "💰 Collection priority");
    for (const [name, amt] of topPending) {
      lines.push(ar ? `• «${name}»: ${money(amt)}` : `• “${name}”: ${money(amt)}`);
    }
    lines.push(
      ar
        ? "→ حدّد المشاريع واعمل تحصيل جماعي، أو افتح صفحة التحصيلات."
        : "→ Multi-select and bulk-collect, or open the collections page."
    );
  }

  if (byType.length > 0) {
    lines.push("");
    lines.push(ar ? "📁 توزيع الشغل النشط" : "📁 Active work mix");
    lines.push(
      byType
        .slice(0, 4)
        .map(
          (r: { _id: string; count: number; agreedEgp: number }) =>
            `${typeLabel(String(r._id))}: ${r.count} · ${money(r.agreedEgp)}`
        )
        .join("  |  ")
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
