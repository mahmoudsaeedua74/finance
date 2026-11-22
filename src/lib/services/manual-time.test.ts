import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateFeatureCostEgp } from "@/lib/feature-pricing";
import { logManualTime } from "@/lib/services/time-tracking-service";

const db = vi.hoisted(() => ({
  saveTime: vi.fn(),
  saveAudit: vi.fn(),
  getTask: vi.fn(),
}));

vi.mock("@/lib/models", () => ({
  TimeSession: { findOneAndUpdate: db.saveTime },
  AuditLog: { updateOne: db.saveAudit },
}));

vi.mock("@/lib/services/feature-service", () => ({
  getFeatureForTimer: db.getTask,
}));

const userId = "000000000000000000000001";
const featureId = "000000000000000000000002";
const taskId = "000000000000000000000003";
const entryId = "000000000000000000000004";

describe("manual task time", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
    db.getTask.mockResolvedValue({ feature: { isArchived: false }, task: { defaultBillable: true } });
  });

  afterEach(() => vi.useRealTimers());

  it("records the first hour as completed billable time without starting a timer", async () => {
    const saved = { _id: entryId, elapsedSeconds: 3600, manualEditReason: "Completed outside the app" };
    db.saveTime.mockReturnValue({ lean: () => Promise.resolve(saved) });

    const session = await logManualTime(userId, featureId, taskId, {
      entryId, elapsedSeconds: 3600, reason: saved.manualEditReason,
    });

    expect(db.getTask).toHaveBeenCalledWith(userId, featureId, taskId);
    expect(db.saveTime).toHaveBeenCalledWith(
      expect.objectContaining({ _id: entryId, userId, source: "manual" }),
      { $setOnInsert: expect.objectContaining({
        status: "stopped", activeStartedAt: null, elapsedSeconds: 3600, billable: true,
        startedAt: new Date("2026-11-22T11:00:00Z"), endedAt: new Date("2026-11-22T12:00:00Z"),
      }) },
      expect.objectContaining({ upsert: true }),
    );
    expect(db.saveAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: entryId, action: "manual_time_added" }),
      expect.anything(),
      { upsert: true },
    );
    expect(calculateFeatureCostEgp(session.elapsedSeconds, 500)).toBe(500);
  });

  it("rejects a zero or fractional duration before saving", async () => {
    for (const elapsedSeconds of [0, 1.5]) {
      await expect(logManualTime(userId, featureId, taskId, { entryId, elapsedSeconds })).rejects.toThrow("positive duration");
    }
    expect(db.saveTime).not.toHaveBeenCalled();
  });
});
