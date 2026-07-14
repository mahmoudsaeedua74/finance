import mongoose from "mongoose";
import { FreelanceProject } from "@/lib/models";
import { collectProjectPayment } from "@/lib/services/project-payout-service";
import type { PaymentMethod } from "@/lib/payment-method";
import {
  assertJobNotCancelled,
  resolveCollectPaymentMethod,
} from "@/lib/project-job-lifecycle";
import { syncJobStatus } from "@/lib/services/freelance-project-service";

export async function bulkCollectProjectJobs(
  userId: string,
  ids: string[],
  input: { date: Date; paymentMethod: PaymentMethod }
) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => mongoose.isValidObjectId(id))));
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of uniqueIds) {
    try {
      const job = await FreelanceProject.findOne({ _id: id, userId }).lean();
      if (!job) {
        results.push({ id, ok: false, error: "Not found" });
        continue;
      }
      assertJobNotCancelled(job.status);
      const paymentMethod = resolveCollectPaymentMethod(
        input.paymentMethod,
        job.expectedPaymentMethod
      );
      await collectProjectPayment(userId, job as never, {
        date: input.date,
        paymentMethod,
      });
      await syncJobStatus(id, userId);
      results.push({ id, ok: true });
    } catch (e) {
      results.push({
        id,
        ok: false,
        error: e instanceof Error ? e.message : "Collect failed",
      });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return { results, okCount, failed: results.length - okCount };
}
