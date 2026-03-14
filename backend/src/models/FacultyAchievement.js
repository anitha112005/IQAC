import mongoose from "mongoose";

const facultyAchievementSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["publication", "conference", "award", "patent", "other"],
      default: "other"
    },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("FacultyAchievement", facultyAchievementSchema);
