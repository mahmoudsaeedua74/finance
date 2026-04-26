import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { User, Income, Expense, Project } from "../src/lib/models";

async function main() {
  await connectDB();
  const user = await User.findOne().sort({ createdAt: 1 }).lean();
  if (!user) throw new Error("No users found");
  const userId = String(user._id);

  const [inc, exp, proj] = await Promise.all([
    Income.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
    Expense.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
    Project.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
  ]);

  console.log("Backfill complete", {
    income: inc.modifiedCount,
    expense: exp.modifiedCount,
    project: proj.modifiedCount,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
