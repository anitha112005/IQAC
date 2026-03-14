import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const reportLogSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: [
        "STUDENT_PROGRESS",
        "DEPARTMENT_PERFORMANCE",
        "CGPA_DISTRIBUTION",
        "BACKLOG_ANALYSIS",
        "PLACEMENT",
        "FACULTY_CONTRIBUTION",
        "SECTION_WISE"
      ],
      required: true
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filters: { type: Object, default: {} },
    format: { type: String, enum: ["PDF", "EXCEL"], required: true }
  },
  { timestamps: true }
);

export default mainDB.model("ReportLog", reportLogSchema);
