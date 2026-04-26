import { Goal, GoalContribution } from "@/lib/models";

type GoalRow = {
  _id: string;
  name: string;
  targetAmount: number;
  deadline: Date | null;
  status: string;
  totalSaved: number;
  percentage: number;
  remaining: number;
};

function buildRows(
  goals: {
    _id: unknown;
    name: string;
    targetAmount: number;
    deadline: Date | null;
    status: string;
    manualContributionTotal?: number;
  }[],
  byGoal: Map<string, number>
): GoalRow[] {
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

type LeanGoal = {
  _id: unknown;
  name: string;
  targetAmount: number;
  deadline: Date | null;
  status: string;
  manualContributionTotal?: number;
};

export async function getGoalProgress(userId: string) {
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
  if (goals.length === 0) return [];
  return getGoalProgressForGoals(userId, goals as LeanGoal[]);
}

/**
 * Paged list: fetches at most `limit + 1` goals (caller trims with `toPaginatedBody`).
 */
export async function getGoalProgressPage(userId: string, offset: number, take: number) {
  const goals = await Goal.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .skip(offset)
    .limit(take)
    .lean();
  if (goals.length === 0) return [];
  return getGoalProgressForGoals(userId, goals as LeanGoal[]);
}

async function getGoalProgressForGoals(userId: string, goals: LeanGoal[]) {
  const goalIds = goals.map((g) => g._id);
  const contributions = await GoalContribution.aggregate<{ _id: string; total: number }>([
    { $match: { userId, goalId: { $in: goalIds } } },
    { $group: { _id: "$goalId", total: { $sum: "$amount" } } },
  ]);
  const byGoal = new Map(contributions.map((c) => [String(c._id), c.total]));
  return buildRows(goals, byGoal);
}
