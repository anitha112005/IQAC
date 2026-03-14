import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    advisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subjects: [{ type: String, trim: true, uppercase: true }],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }]
  },
  { timestamps: true }
);

sectionSchema.index({ department: 1, code: 1 }, { unique: true });

export default mongoose.model("Section", sectionSchema);
