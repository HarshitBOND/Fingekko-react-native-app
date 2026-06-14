import mongoose, { Types } from "mongoose";

interface IGroup {
  name: string;
  description: string;
  currency: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  isArchived?: boolean;
}

const groupSchema = new mongoose.Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    currency: { type: String, required: true, default: "INR" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Group = mongoose.model<IGroup>("Group", groupSchema);

export default Group;