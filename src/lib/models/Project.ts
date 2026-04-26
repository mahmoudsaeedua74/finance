import mongoose, { Schema, type Model } from "mongoose";

export interface IProject {
  _id: string;
  userId: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ userId: 1, date: -1 });

export const Project: Model<IProject> =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
