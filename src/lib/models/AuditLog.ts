import mongoose, { Schema, type Model } from "mongoose";

export interface IAuditLog {
  _id: string;
  userId: mongoose.Types.ObjectId;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true, trim: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, trim: true, default: "", maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ userId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
