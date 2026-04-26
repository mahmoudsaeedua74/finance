import { addDays } from "date-fns";
import { Income, RecurringIncomeTemplate } from "@/lib/models";

function shouldGenerateOnDate(date: Date, frequency: "monthly" | "weekly", cursor: Date) {
  if (frequency === "weekly") {
    const diff = Math.floor((date.getTime() - cursor.getTime()) / (24 * 3600 * 1000));
    return diff % 7 === 0;
  }
  return cursor.getDate() === date.getDate();
}

export async function materializeRecurringIncomes(userId: string, now = new Date()) {
  const templates = await RecurringIncomeTemplate.find({ userId, active: true }).lean();
  let created = 0;

  for (const t of templates) {
    const start = new Date(t.startDate);
    const end = t.endDate ? new Date(t.endDate) : now;
    if (start > now) continue;
    const from = t.lastGeneratedAt ? addDays(new Date(t.lastGeneratedAt), 1) : start;
    for (let d = new Date(from); d <= end && d <= now; d = addDays(d, 1)) {
      if (!shouldGenerateOnDate(start, t.frequency, d)) continue;
      const existing = await Income.findOne({
        userId,
        title: t.title,
        date: d,
        incomeType: "salary",
      }).lean();
      if (existing) continue;
      await Income.create({
        userId,
        title: t.title,
        amount: t.amount,
        date: d,
        incomeType: "salary",
      });
      created += 1;
    }
    await RecurringIncomeTemplate.updateOne({ _id: t._id }, { $set: { lastGeneratedAt: now } });
  }

  return { created };
}
