import mongoose from "mongoose";
import { ClientProfile, FreelanceProject, Project } from "@/lib/models";
import { getClientProfile, upsertClientProfile } from "@/lib/services/client-profile-service";

export type ClientOption = {
  clientName: string;
  phone: string;
};

export type ClientSummary = {
  clientName: string;
  projectCount: number;
  activeCount: number;
  agreed: number;
  collected: number;
  pending: number;
  lastProjectAt: string;
};

export type ClientDetail = ClientSummary & {
  profile: {
    phone: string;
    whatsapp: string;
    notes: string;
  };
  projects: {
    id: string;
    name: string;
    projectType: string;
    workPhase: string;
    status: string;
    agreedAmount: number;
    collectedAmount: number;
    pendingAmount: number;
    createdAt: string;
  }[];
};

async function collectedByJobMap(userId: mongoose.Types.ObjectId) {
  const payouts = await Project.find({
    userId,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  })
    .select("freelanceProjectId amount")
    .lean();

  const map = new Map<string, number>();
  for (const p of payouts) {
    if (!p.freelanceProjectId) continue;
    const id = String(p.freelanceProjectId);
    map.set(id, (map.get(id) ?? 0) + p.amount);
  }
  return map;
}

export async function listClientSummaries(userId: string): Promise<ClientSummary[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const [jobs, collectedMap] = await Promise.all([
    FreelanceProject.find({ userId: uid, clientName: { $nin: ["", null] } }).lean(),
    collectedByJobMap(uid),
  ]);

  const byClient = new Map<string, ClientSummary & { lastAt: Date }>();

  for (const job of jobs) {
    const cn = job.clientName?.trim();
    if (!cn) continue;
    const collected = collectedMap.get(String(job._id)) ?? 0;
    const pending = Math.max(0, job.agreedAmount - collected);
    const row = byClient.get(cn) ?? {
      clientName: cn,
      projectCount: 0,
      activeCount: 0,
      agreed: 0,
      collected: 0,
      pending: 0,
      lastProjectAt: job.createdAt.toISOString(),
      lastAt: job.createdAt,
    };
    row.projectCount += 1;
    row.agreed += job.agreedAmount;
    row.collected += collected;
    row.pending += pending;
    if (job.status !== "collected" && job.status !== "cancelled") {
      row.activeCount += 1;
    }
    if (job.createdAt > row.lastAt) {
      row.lastAt = job.createdAt;
      row.lastProjectAt = job.createdAt.toISOString();
    }
    byClient.set(cn, row);
  }

  const summaries = Array.from(byClient.values()).map(({ lastAt: _lastAt, ...rest }) => rest);
  return mergeProfileOnlyClients(uid, summaries);
}

async function mergeProfileOnlyClients(
  userId: mongoose.Types.ObjectId,
  summaries: ClientSummary[]
): Promise<ClientSummary[]> {
  const profiles = await ClientProfile.find({ userId }).select("clientName createdAt").lean();
  const known = new Set(summaries.map((s) => s.clientName));
  const extras: ClientSummary[] = [];
  for (const row of profiles) {
    const cn = row.clientName?.trim();
    if (!cn || known.has(cn)) continue;
    extras.push({
      clientName: cn,
      projectCount: 0,
      activeCount: 0,
      agreed: 0,
      collected: 0,
      pending: 0,
      lastProjectAt: row.createdAt.toISOString(),
    });
  }
  return [...summaries, ...extras].sort(
    (a, b) => new Date(b.lastProjectAt).getTime() - new Date(a.lastProjectAt).getTime()
  );
}

export async function listClientOptions(userId: string): Promise<ClientOption[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const [profiles, projectNames] = await Promise.all([
    ClientProfile.find({ userId: uid }).select("clientName phone").lean(),
    FreelanceProject.distinct("clientName", {
      userId: uid,
      clientName: { $nin: ["", null] },
    }),
  ]);

  const map = new Map<string, ClientOption>();
  for (const row of profiles) {
    const cn = row.clientName?.trim();
    if (!cn) continue;
    map.set(cn, { clientName: cn, phone: row.phone?.trim() ?? "" });
  }
  for (const raw of projectNames as string[]) {
    const cn = raw.trim();
    if (!cn || map.has(cn)) continue;
    map.set(cn, { clientName: cn, phone: "" });
  }

  return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, "ar"));
}

export async function createClient(
  userId: string,
  input: { clientName: string; phone?: string }
): Promise<ClientOption> {
  const name = input.clientName.trim();
  if (!name) throw new Error("Client name required");
  const profile = await upsertClientProfile(userId, name, {
    ...(typeof input.phone === "string" && input.phone.trim() ? { phone: input.phone } : {}),
  });
  return { clientName: profile.clientName, phone: profile.phone };
}

export async function getClientDetail(userId: string, clientName: string): Promise<ClientDetail | null> {
  const uid = new mongoose.Types.ObjectId(userId);
  const name = clientName.trim();
  if (!name) return null;

  const jobs = await FreelanceProject.find({ userId: uid, clientName: name })
    .sort({ createdAt: -1 })
    .lean();

  const [collectedMap, profile, profileRow] = await Promise.all([
    collectedByJobMap(uid),
    getClientProfile(userId, name),
    ClientProfile.findOne({ userId: uid, clientName: name }).lean(),
  ]);

  if (jobs.length === 0) {
    if (!profileRow) return null;
    return {
      clientName: name,
      projectCount: 0,
      activeCount: 0,
      agreed: 0,
      collected: 0,
      pending: 0,
      lastProjectAt: profileRow.createdAt.toISOString(),
      profile: {
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        notes: profile.notes,
      },
      projects: [],
    };
  }

  let agreed = 0;
  let collected = 0;
  let pending = 0;
  let activeCount = 0;

  const projects = jobs.map((job) => {
    const collectedAmount = collectedMap.get(String(job._id)) ?? 0;
    const pendingAmount = Math.max(0, job.agreedAmount - collectedAmount);
    agreed += job.agreedAmount;
    collected += collectedAmount;
    pending += pendingAmount;
    if (job.status !== "collected" && job.status !== "cancelled") activeCount += 1;

    return {
      id: String(job._id),
      name: job.name,
      projectType: job.projectType,
      workPhase: job.workPhase ?? "in_progress",
      status: job.status,
      agreedAmount: job.agreedAmount,
      collectedAmount,
      pendingAmount,
      createdAt: job.createdAt.toISOString(),
    };
  });

  return {
    clientName: name,
    projectCount: jobs.length,
    activeCount,
    agreed,
    collected,
    pending,
    lastProjectAt: jobs[0]!.createdAt.toISOString(),
    profile: {
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      notes: profile.notes,
    },
    projects,
  };
}

export async function listDistinctClientNames(userId: string): Promise<string[]> {
  const options = await listClientOptions(userId);
  return options.map((o) => o.clientName);
}
