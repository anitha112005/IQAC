import mongoose from "mongoose";

const studentAchievementSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["academic", "sports", "innovation", "cultural", "other"],
      default: "academic"
    },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("StudentAchievement", studentAchievementSchema);
