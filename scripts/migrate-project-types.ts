/**
 * Set projectType on existing freelance jobs.
 * Sweitcher css stores → css, everything else → normal.
 */
import "dotenv/config";
import { connectDB } from "../src/lib/mongodb";
import { FreelanceProject } from "../src/lib/models";

const CSS_NAMES = [
  "متجر سويتشر روح المغرب css",
  "متجر سويتشر azimuthuae css",
];

async function main() {
  await connectDB();
  const all = await FreelanceProject.find().select("name projectType").lean();
  let css = 0;
  let normal = 0;
  for (const j of all) {
    const type = CSS_NAMES.some((n) => j.name.trim() === n) ? "css" : "normal";
    if (j.projectType !== type) {
      await FreelanceProject.updateOne({ _id: j._id }, { $set: { projectType: type } });
    }
    if (type === "css") css++;
    else normal++;
  }
  console.log(`Updated ${all.length} jobs — css: ${css}, normal: ${normal}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
