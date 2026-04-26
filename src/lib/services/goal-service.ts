import { Goal, GoalContribution } from "@/lib/models";

export async function getGoalProgress(userId: string) {
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
  const goalIds = goals.map((g) => g._id);
  const contributions = await GoalContribution.aggregate<{ _id: string; total: number }>([
    { $match: { userId, goalId: { $in: goalIds } } },
    { $group: { _id: "$goalId", total: { $sum: "$amount" } } },
  ]);
  const byGoal = new Map(contributions.map((c) => [String(c._id), c.total]));

  return goals.map((g) => {
    const manual = byGoal.get(String(g._id)) || 0;
    const totalSaved = manual + (g.manualContributionTotal || 0);
    const pct = g.targetAmount > 0 ? Math.min(100, (totalSaved / g.targetAmount) * 100) : 0;
    return {
      _id: String(g._id),
      name: g.name,
      targetAmount: g.targetAmount,
      deadline: g.deadline,
      status: g.status,
      totalSaved,
      percentage: pct,
      remaining: Math.max(0, g.targetAmount - totalSaved),
    };
  });
}
