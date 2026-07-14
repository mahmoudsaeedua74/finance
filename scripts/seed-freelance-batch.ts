/**
 * Seed freelance project jobs for a user.
 * Usage: npx tsx scripts/seed-freelance-batch.ts [user-email]
 */
import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { FreelanceProject, Project, User } from "../src/lib/models";
import { syncJobStatus } from "../src/lib/services/freelance-project-service";

type JobInput = {
  name: string;
  agreedAmount: number;
  isCollected: boolean;
  paymentMethod: "card";
  projectType?: "css" | "normal";
  date?: Date;
};

const PENDING: JobInput[] = [
  { name: "متجر أوفيا", agreedAmount: 500, isCollected: false, paymentMethod: "card" },
  { name: "متجر Loverda", agreedAmount: 500, isCollected: false, paymentMethod: "card" },
  { name: "متجر سرعه الفهد", agreedAmount: 500, isCollected: false, paymentMethod: "card" },
  { name: "متجر مصعب", agreedAmount: 500, isCollected: false, paymentMethod: "card" },
];

const COLLECTED_TODAY: JobInput[] = [
  { name: "متجر سويتشر روح المغرب css", agreedAmount: 3000, isCollected: true, paymentMethod: "card", projectType: "css" },
  { name: "متجر سويتشر azimuthuae css", agreedAmount: 3000, isCollected: true, paymentMethod: "card", projectType: "css" },
];

async function upsertJob(userId: string, input: JobInput, today: Date) {
  const startDate = input.date ?? today;
  const existing = await FreelanceProject.findOne({ userId, name: input.name }).lean();
  if (existing) {
    console.log("Skip (exists):", input.name);
    return;
  }

  const job = await FreelanceProject.create({
    userId,
    name: input.name,
    agreedAmount: input.agreedAmount,
    notes: "",
    startDate,
    expectedPaymentDate: null,
    expectedPaymentMethod: input.paymentMethod,
    projectType: input.projectType ?? "normal",
    status: input.isCollected ? "collected" : "pending",
  });

  await Project.create({
    userId,
    freelanceProjectId: job._id,
    name: input.name,
    amount: input.agreedAmount,
    date: startDate,
    isCollected: input.isCollected,
    collectedAt: input.isCollected ? today : null,
    paymentMethod: input.paymentMethod,
    note: input.isCollected ? "Initial collection" : "Pending collection",
  });

  await syncJobStatus(String(job._id), userId);
  console.log(
    input.isCollected ? "Created (collected):" : "Created (pending):",
    input.name,
    input.agreedAmount
  );
}

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }

  await connectDB();
  const user = emailArg
    ? await User.findOne({ email: emailArg }).lean()
    : await User.findOne().sort({ createdAt: 1 }).lean();

  if (!user) {
    console.error(emailArg ? `User not found: ${emailArg}` : "No users in database");
    process.exit(1);
  }

  const userId = String(user._id);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  console.log("User:", user.email);
  console.log("Collection date (collected):", today.toISOString().slice(0, 10));

  for (const j of PENDING) await upsertJob(userId, j, today);
  for (const j of COLLECTED_TODAY) await upsertJob(userId, { ...j, date: today }, today);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
