/**
 * Create a user (hash password) in MongoDB.
 * Usage:  npx tsx scripts/create-user.ts you@email.com "your-secure-password"
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/lib/mongodb";
import { User } from "../src/lib/models";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-user.ts you@email.com "password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  await connectDB();
  const e = email.trim().toLowerCase();
  const existing = await User.findOne({ email: e });
  if (existing) {
    console.error("User already exists:", e);
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email: e, passwordHash, name: "" });
  console.log("Created user:", e);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
