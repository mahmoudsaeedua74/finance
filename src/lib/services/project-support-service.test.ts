import { beforeEach, describe, expect, it, vi } from "vitest";
import { mutateProjectSupport } from "@/lib/services/project-support-service";

const db = vi.hoisted(() => ({
  create: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock("@/lib/models", () => ({ Project: db }));

const userId = "000000000000000000000001";
const project = { _id: "000000000000000000000002", name: "Store", expectedPaymentMethod: "unspecified" as const };
const supportId = "000000000000000000000003";
const dueDate = new Date("2026-12-01");
const receiptDate = new Date("2026-11-22");
const scope = { userId, freelanceProjectId: project._id, lineKind: "support" };

describe("support payments", () => {
  beforeEach(() => vi.resetAllMocks());

  it("adds a due payment without needing a payment method", async () => {
    await mutateProjectSupport(userId, project, "add_support", { amount: 4000, date: "2026-12-01" });
    expect(db.create).toHaveBeenCalledWith(expect.objectContaining({
      ...scope, amount: 4000, isCollected: false, dueDate, date: dueDate,
      collectedAt: null, paymentMethod: "unspecified",
    }));
  });

  it("records a receipt immediately when collection is explicitly selected", async () => {
    await mutateProjectSupport(userId, project, "add_support", {
      entryId: supportId, amount: 4000, date: "2026-11-22", paymentMethod: "card", isCollected: true,
    });
    expect(db.updateOne).toHaveBeenCalledWith(
      { ...scope, _id: supportId },
      { $setOnInsert: expect.objectContaining({
        amount: 4000, isCollected: true, collectedAt: receiptDate, paymentMethod: "card",
      }) },
      expect.objectContaining({ upsert: true }),
    );
  });

  it("only collects the matching pending support row and preserves its original due date", async () => {
    db.findOne.mockReturnValue({ lean: async () => ({ amount: 4000, date: dueDate, isCollected: false }) });
    db.updateOne.mockResolvedValue({ matchedCount: 1 });
    await mutateProjectSupport(userId, project, "collect_support", {
      supportId, amount: 4000, date: "2026-11-22", paymentMethod: "cash",
    });
    expect(db.findOne).toHaveBeenCalledWith({ ...scope, _id: supportId });
    expect(db.updateOne).toHaveBeenCalledWith(
      { ...scope, _id: supportId, isCollected: false, amount: 4000, date: dueDate },
      { $set: {
        isCollected: true, date: receiptDate, collectedAt: receiptDate, dueDate, paymentMethod: "cash",
      } },
    );
    expect(db.create).not.toHaveBeenCalled();
  });

  it("edits the due date of scheduled support while keeping it uncollected", async () => {
    db.findOne.mockReturnValue({ lean: async () => ({ isCollected: false }) });
    db.updateOne.mockResolvedValue({ matchedCount: 1 });
    await mutateProjectSupport(userId, project, "update_support", {
      supportId, amount: 4500, date: "2026-12-01", isCollected: true,
    });
    expect(db.updateOne).toHaveBeenCalledWith(
      { ...scope, _id: supportId, isCollected: false },
      { $set: expect.objectContaining({ amount: 4500, collectedAt: null, dueDate }) },
      expect.anything(),
    );
  });
});
