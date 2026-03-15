import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const departmentStatSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    averageCgpa: { type: Number, default: 0 },
    backlogRate: { type: Number, default: 0 },
    internshipParticipationPercent: { type: Number, default: 0 },
    placementRate: { type: Number, default: 0 }
  },
  { timestamps: true }
);

departmentStatSchema.index({ department: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mainDB.model("DepartmentStat", departmentStatSchema);
