import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    hod: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    vision: { type: String, default: "" },
    mission: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
