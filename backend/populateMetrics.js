// populateMetrics.js — Compute Student.metrics[] from raw Mark + Attendance data
import { connectDB } from "./src/config/db.js";
import Student from "./src/models/Student.js";
import Mark from "./src/models/Mark.js";
import Attendance from "./src/models/Attendance.js";

await connectDB();

const students = await Student.find();
console.log(`Processing ${students.length} students...`);

let updated = 0;

for (const student of students) {
  // Use .lean() to get raw MongoDB documents with actual field names
  const marks = await Mark.find({ student: student._id }).lean();
  const attendances = await Attendance.find({ student: student._id }).lean();

  if (marks.length === 0) continue;

  // Group marks by semester
  const semesterMap = {};
  for (const mark of marks) {
    const sem = mark.semester;
    if (!semesterMap[sem]) {
      semesterMap[sem] = {
        semester: sem,
        academicYear: mark.academicYear || "2024-25",
        totalCredits: 0,
        weightedSum: 0,
        backlogCount: 0
      };
    }

    // Raw field names from DB: totalMarks, internalMarks, externalMarks, status
    const totalMarks = mark.totalMarks || mark.total || 0;
    const credits = mark.credits > 0 ? mark.credits : 3;
    const gradePoint = Math.min(10, Math.max(0, (totalMarks / 100) * 10));
    const passed = mark.status ? mark.status === "PASS" : (mark.passed !== false);

    semesterMap[sem].totalCredits += credits;
    semesterMap[sem].weightedSum += gradePoint * credits;
    if (!passed) semesterMap[sem].backlogCount++;
  }

  const metricsArr = [];
  const semesters = Object.keys(semesterMap).map(Number).sort((a, b) => a - b);
  let cumCredits = 0, cumWeighted = 0;

  for (const sem of semesters) {
    const d = semesterMap[sem];
    const sgpa = d.totalCredits > 0 ? Math.round((d.weightedSum / d.totalCredits) * 100) / 100 : 5.0;
    cumCredits += d.totalCredits;
    cumWeighted += d.weightedSum;
    const cgpa = cumCredits > 0 ? Math.round((cumWeighted / cumCredits) * 100) / 100 : 5.0;

    const att = attendances.find(a => a.semester === sem);
    const attendancePercent = att ? (att.percentage || 75) : 75;

    metricsArr.push({
      semester: sem,
      academicYear: String(d.academicYear),
      sgpa: isNaN(sgpa) ? 5.0 : Math.min(10, sgpa),
      cgpa: isNaN(cgpa) ? 5.0 : Math.min(10, cgpa),
      backlogCount: d.backlogCount,
      attendancePercent: isNaN(attendancePercent) ? 75 : attendancePercent
    });
  }

  if (metricsArr.length === 0) continue;

  const latest = metricsArr[metricsArr.length - 1];
  let riskLevel = "LOW";
  if (latest.cgpa < 5.0 || latest.attendancePercent < 65 || latest.backlogCount >= 3) {
    riskLevel = "HIGH";
  } else if (latest.cgpa < 6.5 || latest.attendancePercent < 75 || latest.backlogCount >= 1) {
    riskLevel = "MEDIUM";
  }

  await Student.collection.updateOne(
    { _id: student._id },
    { $set: { metrics: metricsArr, riskLevel } }
  );
  updated++;
}

console.log(`\n✅ Updated ${updated}/${students.length} students with metrics and risk levels`);

// Verification
const highRisk = await Student.countDocuments({ riskLevel: "HIGH" });
const mediumRisk = await Student.countDocuments({ riskLevel: "MEDIUM" });
const lowRisk = await Student.countDocuments({ riskLevel: "LOW" });
console.log(`  HIGH risk: ${highRisk} | MEDIUM risk: ${mediumRisk} | LOW risk: ${lowRisk}`);

const sample = await Student.findOne({ "metrics.0": { $exists: true } }).lean();
if (sample) {
  console.log(`\nSample: ${sample.name} (${sample.rollNo}) — Risk: ${sample.riskLevel}`);
  sample.metrics.forEach(m => {
    console.log(`  Sem ${m.semester}: SGPA=${m.sgpa} CGPA=${m.cgpa} Backlogs=${m.backlogCount} Att=${m.attendancePercent}%`);
  });
}

process.exit(0);
