import mongoose from "mongoose";
import { FreelanceProject, Project } from "@/lib/models";
import { monthDateBoundsUTC } from "@/lib/db-month-filters";
import { listClientSummaries } from "@/lib/services/client-service";

export type FreelanceKpis = {
  clientCount: number;
  activeProjects: number;
  totalPending: number;
  monthCollected: number;
  dueThisWeek: number;
  overdueCount: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export async function getFreelanceKpis(userId: string, year: number, month: number): Promise<FreelanceKpis> {
  const uid = new mongoose.Types.ObjectId(userId);
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = addDays(today, 7);

  const [clients, activeProjects, pendingJobs, monthPayouts, pendingInstallments, overdueJobs] =
    await Promise.all([
      listClientSummaries(userId),
      FreelanceProject.countDocuments({
        userId: uid,
        status: { $in: ["pending", "partial"] },
      }),
      FreelanceProject.find({
        userId: uid,
        status: { $in: ["pending", "partial"] },
      })
        .select("_id agreedAmount")
        .lean(),
      Project.find({
        userId: uid,
        isCollected: true,
        date: { $gte: mStart, $lte: mEnd },
      })
        .select("amount")
        .lean(),
      Project.find({
        userId: uid,
        isCollected: false,
        date: { $gte: today, $lt: weekEnd },
      }).countDocuments(),
      FreelanceProject.countDocuments({
        userId: uid,
        status: { $in: ["pending", "partial"] },
        expectedPaymentDate: { $lt: today, $ne: null },
      }),
    ]);

  const collectedByJob = await Project.find({
    userId: uid,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  })
    .select("freelanceProjectId amount")
    .lean();

  const colMap = new Map<string, number>();
  for (const p of collectedByJob) {
    if (!p.freelanceProjectId) continue;
    const id = String(p.freelanceProjectId);
    colMap.set(id, (colMap.get(id) ?? 0) + p.amount);
  }

  let totalPending = 0;
  for (const job of pendingJobs) {
    const col = colMap.get(String(job._id)) ?? 0;
    totalPending += Math.max(0, job.agreedAmount - col);
  }

  const monthCollected = monthPayouts.reduce((s, p) => s + p.amount, 0);

  return {
    clientCount: clients.length,
    activeProjects,
    totalPending,
    monthCollected,
    dueThisWeek: pendingInstallments,
    overdueCount: overdueJobs,
  };
}
