import mongoose from "mongoose";
import { ClientProfile } from "@/lib/models";

export type ClientProfileDto = {
  clientName: string;
  phone: string;
  whatsapp: string;
  notes: string;
};

export async function getClientProfile(
  userId: string,
  clientName: string
): Promise<ClientProfileDto> {
  const name = clientName.trim();
  const uid = new mongoose.Types.ObjectId(userId);
  const row = await ClientProfile.findOne({ userId: uid, clientName: name }).lean();
  return {
    clientName: name,
    phone: row?.phone?.trim() ?? "",
    whatsapp: row?.whatsapp?.trim() ?? "",
    notes: row?.notes?.trim() ?? "",
  };
}

export async function upsertClientProfile(
  userId: string,
  clientName: string,
  input: Partial<ClientProfileDto>
): Promise<ClientProfileDto> {
  const name = clientName.trim();
  if (!name) throw new Error("Client name required");
  const uid = new mongoose.Types.ObjectId(userId);
  const $set: Record<string, string> = {};
  if (typeof input.phone === "string") $set.phone = input.phone.trim().slice(0, 50);
  if (typeof input.whatsapp === "string") $set.whatsapp = input.whatsapp.trim().slice(0, 50);
  if (typeof input.notes === "string") $set.notes = input.notes.trim().slice(0, 2000);

  const doc = await ClientProfile.findOneAndUpdate(
    { userId: uid, clientName: name },
    {
      ...(Object.keys($set).length ? { $set } : {}),
      $setOnInsert: { userId: uid, clientName: name, phone: "", whatsapp: "", notes: "" },
    },
    { upsert: true, new: true }
  ).lean();
  return {
    clientName: name,
    phone: doc?.phone?.trim() ?? "",
    whatsapp: doc?.whatsapp?.trim() ?? "",
    notes: doc?.notes?.trim() ?? "",
  };
}

export async function ensureClientPhone(
  userId: string,
  clientName: string,
  phone?: string
): Promise<void> {
  const name = clientName.trim();
  const p = phone?.trim().slice(0, 50) ?? "";
  if (!name || !p) return;
  await upsertClientProfile(userId, name, { phone: p });
}
