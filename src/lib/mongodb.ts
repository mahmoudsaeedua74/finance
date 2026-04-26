import dns from "node:dns";
import mongoose from "mongoose";

/**
 * `mongodb+srv://` must resolve an SRV record (`_mongodb._tcp...`). On some
 * networks (ISP DNS, Windows defaults) that lookup fails with
 * `querySrv ECONNREFUSED`. Use public resolvers for this process only.
 * Set MONGODB_SKIP_FIX_DNS=1 in .env to opt out.
 */
function ensureDnsForAtlasSrv(uri: string) {
  if (process.env.MONGODB_SKIP_FIX_DNS === "1") return;
  if (!uri.startsWith("mongodb+srv://")) return;
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);
  } catch {
    // ignore: rare restricted environments
  }
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const g = global as unknown as { _mongooseCache?: MongooseCache };
const cache: MongooseCache = g._mongooseCache ?? {
  conn: null,
  promise: null,
};
g._mongooseCache = cache;

/**
 * Reuses a single Mongoose connection across hot reloads in dev.
 * Use this in all Next.js Route Handlers that talk to MongoDB.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env (see .env.example).");
  }
  ensureDnsForAtlasSrv(uri);
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
