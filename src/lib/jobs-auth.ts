/** Authorize scheduled job routes (Vercel Cron, manual curl, external scheduler). */
export function authorizeJobs(req: Request): boolean {
  const jobSecret = process.env.JOBS_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!jobSecret && !cronSecret) return false;
  if (jobSecret && req.headers.get("x-jobs-secret") === jobSecret) return true;

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!bearer) return false;
  if (jobSecret && bearer === jobSecret) return true;
  if (cronSecret && bearer === cronSecret) return true;
  return false;
}

export function isJobsAuthConfigured(): boolean {
  return Boolean(process.env.JOBS_SECRET?.trim() || process.env.CRON_SECRET?.trim());
}
