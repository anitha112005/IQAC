import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Research from "../models/Research.js";
import Student from "../models/Student.js";

export const uploadMarks = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const payload = { ...req.body, student: studentId, enteredBy: req.user._id };
  const mark = await Mark.findOneAndUpdate(
    {
      student: studentId,
      subjectCode: req.body.subjectCode,
      semester: req.body.semester,
      academicYear: req.body.academicYear
    },
    payload,
    { upsert: true, new: true }
  );

  return res.status(200).json({ success: true, data: mark });
};

export const uploadAttendance = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const totalClasses = Number(req.body.totalClasses);
  const attendedClasses = Number(req.body.attendedClasses);
  const percentage = totalClasses ? (attendedClasses / totalClasses) * 100 : 0;

  const attendance = await Attendance.findOneAndUpdate(
    {
      student: studentId,
      semester: req.body.semester,
      academicYear: req.body.academicYear
    },
    {
      ...req.body,
      student: studentId,
      percentage: Number(percentage.toFixed(2)),
      enteredBy: req.user._id
    },
    { upsert: true, new: true }
  );

  return res.status(200).json({ success: true, data: attendance });
};

export const addResearch = async (req, res) => {
  const research = await Research.create({ ...req.body, faculty: req.user._id });
  return res.status(201).json({ success: true, data: research });
};
