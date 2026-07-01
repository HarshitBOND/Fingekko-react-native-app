import mongoose, { Types } from "mongoose";

interface IGroup {
  name: string;
  description: string;
  currency: string;
  createdBy:string;
  members: string[];
  isArchived?: boolean;
}

const groupSchema = new mongoose.Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    currency: { type: String, required: true, default: "INR" },
    createdBy: { type: String , required: true },
    members: [{ type: String}],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Group = mongoose.model<IGroup>("Group", groupSchema);

export default Group;