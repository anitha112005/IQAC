import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const placementSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    academicYear: { type: String, required: true },
    totalEligible: { type: Number, default: 0 },
    totalPlaced: { type: Number, default: 0 },
    highestPackageLPA: { type: Number, default: 0 },
    medianPackageLPA: { type: Number, default: 0 },
    majorRecruiters: [{ type: String }],
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

placementSchema.index({ department: 1, academicYear: 1 }, { unique: true });

export default mainDB.model("Placement", placementSchema);
