import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

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

export default mainDB.model("Department", departmentSchema);
