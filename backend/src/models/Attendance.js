import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date },
    subjectCode: { type: String, uppercase: true, trim: true },
    subjectName: { type: String, trim: true },
    status: { type: String, enum: ["PRESENT", "ABSENT"] },
    semester: { type: Number },
    academicYear: { type: String },
    totalClasses: { type: Number },
    attendedClasses: { type: Number },
    percentage: { type: Number },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

attendanceSchema.index(
  { student: 1, semester: 1, academicYear: 1 },
  {
    unique: true,
    partialFilterExpression: { semester: { $exists: true }, academicYear: { $exists: true } }
  }
);
attendanceSchema.index(
  { student: 1, date: 1, subjectCode: 1, faculty: 1 },
  { unique: true, partialFilterExpression: { date: { $exists: true }, subjectCode: { $exists: true }, faculty: { $exists: true } } }
);

export default mongoose.model("Attendance", attendanceSchema);
