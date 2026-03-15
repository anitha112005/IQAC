import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const achievementSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Faculty", "Student", "Department"],
      required: true
    },
    level: { type: String, enum: ["Institute", "State", "National", "International"], required: true },
    date: { type: Date, required: true },
    accreditationCriteria: { type: String, default: "NAAC-C5" }
  },
  { timestamps: true }
);

export default mainDB.model("Achievement", achievementSchema);
