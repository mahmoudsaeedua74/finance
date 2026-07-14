import mongoose from "mongoose";
import { FreelanceProject, ProjectTemplate } from "@/lib/models";
import { BUILTIN_PROJECT_TEMPLATES, type ProjectTemplateDto } from "@/lib/project-templates-builtin";
import { normalizePaymentMethod } from "@/lib/payment-method";
import { normalizeProjectType } from "@/lib/project-type";
import { normalizeWorkPhase } from "@/lib/project-work-phase";
import { parseScopeItems } from "@/lib/project-scope";
import { buildProjectJobDto } from "@/lib/services/freelance-project-service";
import { defaultWorkPhaseForCreate } from "@/lib/project-work-phase";

function toUserTemplateDto(row: {
  _id: unknown;
  name: string;
  projectType: string;
  expectedPaymentMethod: string;
  workPhase: string;
  notes?: string;
  scopeItems?: unknown[];
}): ProjectTemplateDto {
  return {
    id: String(row._id),
    name: row.name,
    projectType: normalizeProjectType(row.projectType),
    expectedPaymentMethod: normalizePaymentMethod(row.expectedPaymentMethod),
    workPhase: normalizeWorkPhase(row.workPhase),
    notes: row.notes?.trim() ?? "",
    scopeItems: parseScopeItems(row.scopeItems ?? []),
    isBuiltin: false,
  };
}

export async function listProjectTemplates(userId: string): Promise<ProjectTemplateDto[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const userRows = await ProjectTemplate.find({ userId: uid }).sort({ name: 1 }).lean();
  return [...BUILTIN_PROJECT_TEMPLATES, ...userRows.map(toUserTemplateDto)];
}

export async function saveProjectTemplate(
  userId: string,
  input: {
    name: string;
    projectType?: string;
    expectedPaymentMethod?: string;
    workPhase?: string;
    notes?: string;
    scopeItems?: unknown;
  }
): Promise<ProjectTemplateDto> {
  const name = input.name.trim();
  if (!name) throw new Error("Template name required");
  const uid = new mongoose.Types.ObjectId(userId);
  const doc = await ProjectTemplate.create({
    userId: uid,
    name,
    projectType: normalizeProjectType(input.projectType),
    expectedPaymentMethod: normalizePaymentMethod(input.expectedPaymentMethod),
    workPhase: normalizeWorkPhase(input.workPhase),
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "",
    scopeItems: parseScopeItems(input.scopeItems ?? []),
  });
  return toUserTemplateDto(doc.toObject());
}

export async function deleteProjectTemplate(userId: string, id: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(id)) return false;
  const uid = new mongoose.Types.ObjectId(userId);
  const res = await ProjectTemplate.deleteOne({ _id: id, userId: uid });
  return res.deletedCount > 0;
}

export async function cloneFreelanceProject(
  userId: string,
  sourceId: string,
  input?: { name?: string; agreedAmount?: number; clientName?: string }
) {
  if (!mongoose.isValidObjectId(sourceId)) throw new Error("Invalid id");
  const uid = new mongoose.Types.ObjectId(userId);
  const source = await FreelanceProject.findOne({ _id: sourceId, userId: uid }).lean();
  if (!source) throw new Error("Not found");

  const name = (input?.name ?? `${source.name} (copy)`).trim();
  const agreedAmount =
    input?.agreedAmount != null && Number.isFinite(Number(input.agreedAmount))
      ? Number(input.agreedAmount)
      : source.agreedAmount;
  const clientName = input?.clientName?.trim() ?? source.clientName?.trim() ?? "";

  const job = await FreelanceProject.create({
    userId: uid,
    name,
    agreedAmount,
    clientName,
    projectType: source.projectType,
    scopeItems: source.scopeItems ?? [],
    notes: source.notes?.trim() ?? "",
    expectedPaymentMethod: source.expectedPaymentMethod,
    expectedPaymentDate: source.expectedPaymentDate,
    startDate: new Date(),
    workPhase: defaultWorkPhaseForCreate(false),
    status: "pending",
    isArchived: false,
    archivedAt: null,
  });

  return buildProjectJobDto(job.toObject() as never, userId);
}

export async function setProjectArchived(
  userId: string,
  jobId: string,
  archived: boolean
) {
  if (!mongoose.isValidObjectId(jobId)) throw new Error("Invalid id");
  const uid = new mongoose.Types.ObjectId(userId);
  const job = await FreelanceProject.findOneAndUpdate(
    { _id: jobId, userId: uid },
    { $set: { isArchived: archived, archivedAt: archived ? new Date() : null } },
    { new: true }
  );
  if (!job) throw new Error("Not found");
  return buildProjectJobDto(job.toObject() as never, userId);
}
