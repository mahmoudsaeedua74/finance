/**
 * One-off: recurring templates should have `date === validFrom` (list sort + API model).
 * Run: npx tsx scripts/sync-template-expense-dates.ts
 */
import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { Expense } from "../src/lib/models";

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env first.");
    process.exit(1);
  }
  await connectDB();
  const res = await Expense.updateMany(
    { isTemplate: true, recurring: true },
    [{ $set: { date: "$validFrom" } }]
  );
  console.log("matched:", res.matchedCount, "modified:", res.modifiedCount);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
