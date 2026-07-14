import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { FreelanceProject, User } from "../src/lib/models";

async function main() {
  await connectDB();
  const users = await User.find().select("email _id").lean();
  console.log("Users:", users.map((u) => u.email));
  for (const u of users) {
    const jobs = await FreelanceProject.find({ userId: u._id }).select("name agreedAmount status").lean();
    console.log(`\n${u.email} (${jobs.length} jobs):`);
    for (const j of jobs) console.log(`  - ${j.name} | ${j.agreedAmount} | ${j.status}`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
