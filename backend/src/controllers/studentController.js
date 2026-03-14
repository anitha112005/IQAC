import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import { evaluateRisk } from "../utils/riskEngine.js";

export const createStudent = async (req, res) => {
  const payload = req.body;

  const department = await Department.findById(payload.department);
  if (!department) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  const student = await Student.create(payload);
  return res.status(201).json({ success: true, data: student });
};

export const listStudents = async (req, res) => {
  const { department, academicYear, semester, riskLevel, search } = req.query;

  const filter = {};
  if (department) filter.department = department;
  if (riskLevel) filter.riskLevel = riskLevel;
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { rollNo: { $regex: search, $options: "i" } }];

  const students = await Student.find(filter).populate("department", "name code").sort({ createdAt: -1 });

  const enriched = students.filter((student) => {
    if (!academicYear && !semester) return true;
    return student.metrics.some((m) => {
      if (academicYear && m.academicYear !== academicYear) return false;
      if (semester && m.semester !== Number(semester)) return false;
      return true;
    });
  });

  return res.status(200).json({ success: true, data: enriched });
};

export const addSemesterMetric = async (req, res) => {
  const { studentId } = req.params;
  const { semester, academicYear, sgpa, cgpa, backlogCount, attendancePercent } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const previous = student.metrics.find((m) => m.semester === semester - 1);
  const riskLevel = evaluateRisk({
    attendancePercent,
    backlogCount,
    cgpa,
    previousCgpa: previous?.cgpa
  });

  student.metrics.push({ semester, academicYear, sgpa, cgpa, backlogCount, attendancePercent });
  student.currentSemester = Math.max(student.currentSemester, semester);
  student.riskLevel = riskLevel;
  await student.save();

  return res.status(200).json({ success: true, data: student });
};

export const getStudentDashboard = async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId).populate("department", "name code");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const attendance = await Attendance.find({ student: studentId }).sort({ semester: 1 });
  const marks = await Mark.find({ student: studentId }).sort({ semester: 1 });

  return res.status(200).json({
    success: true,
    data: {
      student,
      cgpaTrend: student.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa })),
      attendance,
      marks,
      backlogBySemester: student.metrics.map((m) => ({ semester: m.semester, backlogCount: m.backlogCount })),
      riskLevel: student.riskLevel
    }
  });
};
