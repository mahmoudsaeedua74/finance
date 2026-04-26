/**
 * Run after MongoDB is up and MONGODB_URI is in .env:
 *   npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { Income, Project, Expense, User } from "../src/lib/models";
import { startOfMonth } from "date-fns";

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env first.");
    process.exit(1);
  }
  await connectDB();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const day = 15;
  const mid = new Date(y, m - 1, day);
  const user = await User.findOne().sort({ createdAt: 1 });
  if (!user) {
    console.error("Create a user first: npm run create-user");
    process.exit(1);
  }
  const userId = String(user._id);

  await Promise.all([
    Income.deleteMany({}),
    Project.deleteMany({}),
    Expense.deleteMany({}),
  ]);

  await Income.insertMany([
    {
      userId,
      title: "Full-time salary",
      amount: 4500,
      date: mid,
      incomeType: "salary",
    },
    {
      userId,
      title: "Client retainer",
      amount: 1200,
      date: new Date(y, m - 1, 8),
      incomeType: "freelance",
    },
  ]);

  await Project.create({
    userId,
    name: "E-commerce relaunch",
    amount: 800,
    date: new Date(y, m - 1, 22),
  });

  await Expense.insertMany([
    {
      userId,
      title: "Grocery + dining",
      amount: 480,
      date: new Date(y, m - 1, 5),
      category: "food",
      kind: "variable",
      recurring: false,
      isTemplate: false,
      validFrom: new Date(y, m - 1, 5),
      validTo: null,
    },
    {
      userId,
      title: "Gym",
      amount: 45,
      date: startOfMonth(mid),
      category: "subscription",
      kind: "fixed",
      recurring: true,
      isTemplate: true,
      validFrom: startOfMonth(new Date(y, 0, 1)),
      validTo: null,
    },
    {
      userId,
      title: "Part-time help",
      amount: 1500,
      date: startOfMonth(mid),
      category: "employee",
      kind: "fixed",
      recurring: true,
      isTemplate: true,
      validFrom: startOfMonth(new Date(y, 0, 1)),
      validTo: null,
    },
  ]);

  console.log("Seed complete for", y, m);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
