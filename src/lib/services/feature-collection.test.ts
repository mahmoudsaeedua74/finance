import { beforeEach, expect, it, vi } from "vitest";
import { createFeaturePayment } from "@/lib/services/feature-payment-service";

const db = vi.hoisted(() => ({
  findFeature: vi.fn(),
  findPayments: vi.fn(),
  findPayment: vi.fn(),
  createPayment: vi.fn(),
  buildFeatureDto: vi.fn(),
}));

vi.mock("@/lib/services/feature-service", () => ({
  buildFeatureDto: db.buildFeatureDto,
}));

vi.mock("@/lib/models", () => ({
  Feature: { findOne: db.findFeature },
  Project: { find: db.findPayments, findOne: db.findPayment, create: db.createPayment },
}));

const userId = "000000000000000000000001";
const featureId = "000000000000000000000002";
const projectId = "000000000000000000000003";
const entryId = "000000000000000000000004";

beforeEach(() => {
  vi.resetAllMocks();
  db.findFeature.mockResolvedValue({
    _id: featureId, freelanceProjectId: projectId, title: "One hour of work", approvedPriceEgp: 500, pricingMode: "hourly",
  });
  db.findPayments.mockReturnValue({ lean: () => Promise.resolve([]) });
  db.findPayment.mockReturnValue({ lean: () => Promise.resolve(null) });
});

it("records a direct collection under the feature with the selected method and date", async () => {
  const date = new Date("2026-11-22");
  db.createPayment.mockResolvedValue({ _id: entryId, amount: 500, isCollected: true });

  await expect(createFeaturePayment(userId, featureId, {
    entryId, amount: 500, date: date.toISOString(), isCollected: true, paymentMethod: "card",
  })).resolves.toEqual({ id: entryId, amountEgp: 500, isCollected: true });

  expect(db.createPayment).toHaveBeenCalledWith(expect.objectContaining({
    _id: entryId, freelanceProjectId: projectId, featureId, lineKind: "feature",
    isCollected: true, collectedAt: date, amount: 500, paymentMethod: "card",
  }));
});

it("returns the same collection when the submission is retried", async () => {
  db.findPayment.mockReturnValue({ lean: () => Promise.resolve({ _id: entryId, amount: 500, isCollected: true }) });
  await expect(createFeaturePayment(userId, featureId, {
    entryId, amount: 500, isCollected: true, paymentMethod: "card",
  })).resolves.toEqual({ id: entryId, amountEgp: 500, isCollected: true });
  expect(db.createPayment).not.toHaveBeenCalled();
});

it("collects the task balance without requiring approval for hourly work", async () => {
  const taskId = "000000000000000000000005";
  db.findFeature.mockResolvedValue({
    _id: featureId, freelanceProjectId: projectId, title: "Feature", approvedPriceEgp: null, pricingMode: "hourly",
  });
  db.buildFeatureDto.mockResolvedValue({
    tasks: [{ id: taskId, title: "Task", activeSession: null, billing: { entryId, collectableAmountEgp: 500 } }],
  });
  db.createPayment.mockResolvedValue({ _id: entryId, amount: 500, isCollected: true });
  const input = { entryId, taskId, date: "2026-11-22", isCollected: true, paymentMethod: "card" };

  await expect(createFeaturePayment(userId, featureId, { ...input, amount: 400 })).rejects.toThrow("Task balance changed");
  expect(db.createPayment).not.toHaveBeenCalled();
  await expect(createFeaturePayment(userId, featureId, { ...input, amount: 500 }))
    .resolves.toEqual({ id: entryId, amountEgp: 500, isCollected: true });
  expect(db.createPayment).toHaveBeenCalledWith(expect.objectContaining({
    taskId: expect.objectContaining({ toHexString: expect.any(Function) }),
    note: "Task", amount: 500, paymentMethod: "card", lineKind: "feature",
  }));
});
