import mongoose from "mongoose";

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

export default mongoose.model("Achievement", achievementSchema);
