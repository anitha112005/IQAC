import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Research from "../models/Research.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Section from "../models/Section.js";
import Department from "../models/Department.js";

export const uploadMarks = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const payload = {
    ...req.body,
    student: studentId,
    section: student.section,
    faculty: req.user._id,
    enteredBy: req.user._id
  };
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

export const getFacultyProfile = async (req, res) => {
  const faculty = await Faculty.findOne({ user: req.user._id }).populate("department", "name code").populate("sections", "name code");
  if (!faculty) {
    return res.status(404).json({ success: false, message: "Faculty profile not found" });
  }

  return res.status(200).json({
    success: true,
    data: {
      name: req.user.name,
      email: req.user.email,
      designation: faculty.designation,
      contactNumber: faculty.contactNumber,
      researchInterests: faculty.researchInterests,
      department: faculty.department,
      sections: faculty.sections
    }
  });
};

export const updateFacultyProfile = async (req, res) => {
  const updates = {
    designation: req.body.designation,
    contactNumber: req.body.contactNumber,
    researchInterests: req.body.researchInterests
  };

  const faculty = await Faculty.findOneAndUpdate({ user: req.user._id }, updates, { new: true }).populate("department", "name code");
  if (!faculty) {
    return res.status(404).json({ success: false, message: "Faculty profile not found" });
  }

  return res.status(200).json({ success: true, data: faculty });
};

export const addFacultyAchievement = async (req, res) => {
  const facultyProfile = await Faculty.findOne({ user: req.user._id });
  if (!facultyProfile) return res.status(404).json({ success: false, message: "Faculty profile not found" });

  const achievement = await FacultyAchievement.create({
    faculty: req.user._id,
    department: facultyProfile.department,
    title: req.body.title,
    type: req.body.type,
    description: req.body.description,
    date: req.body.date || new Date()
  });

  return res.status(201).json({ success: true, data: achievement });
};

export const listFacultyAchievements = async (req, res) => {
  const list = await FacultyAchievement.find({ faculty: req.user._id }).sort({ date: -1 });
  return res.status(200).json({ success: true, data: list });
};

export const assignFacultySections = async (req, res) => {
  const { sectionIds = [] } = req.body;
  const faculty = await Faculty.findOneAndUpdate(
    { user: req.user._id },
    { sections: sectionIds },
    { new: true }
  );
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty profile not found" });

  return res.status(200).json({ success: true, data: faculty });
};

export const markSectionAttendance = async (req, res) => {
  const { sectionId } = req.params;
  const { date, subjectCode, subjectName, entries = [] } = req.body;

  const section = await Section.findById(sectionId).populate("students", "_id");
  if (!section) return res.status(404).json({ success: false, message: "Section not found" });

  const targetDate = new Date(date);
  const writes = entries.map((entry) =>
    Attendance.findOneAndUpdate(
      {
        student: entry.studentId,
        section: sectionId,
        date: targetDate,
        subjectCode,
        faculty: req.user._id
      },
      {
        student: entry.studentId,
        section: sectionId,
        faculty: req.user._id,
        date: targetDate,
        subjectCode,
        subjectName,
        status: entry.status,
        semester: section.semester,
        academicYear: req.body.academicYear
      },
      { upsert: true, new: true }
    )
  );

  const saved = await Promise.all(writes);
  return res.status(200).json({ success: true, data: saved });
};

export const getSectionAttendanceReport = async (req, res) => {
  const { sectionId } = req.params;
  const records = await Attendance.find({ section: sectionId, faculty: req.user._id, date: { $exists: true } }).populate("student", "name rollNo").sort({ date: -1 });

  const grouped = {};
  for (const rec of records) {
    const key = String(rec.student?._id || rec.student);
    if (!grouped[key]) {
      grouped[key] = {
        studentId: rec.student?._id,
        name: rec.student?.name,
        rollNo: rec.student?.rollNo,
        present: 0,
        total: 0
      };
    }
    grouped[key].total += 1;
    if (rec.status === "PRESENT") grouped[key].present += 1;
  }

  const report = Object.values(grouped).map((item) => ({
    ...item,
    attendancePercent: item.total ? Number(((item.present / item.total) * 100).toFixed(2)) : 0
  }));

  return res.status(200).json({ success: true, data: report });
};

export const facultyAnalytics = async (req, res) => {
  const faculty = await Faculty.findOne({ user: req.user._id }).populate("sections", "name code semester");
  if (!faculty) return res.status(404).json({ success: false, message: "Faculty profile not found" });

  const sectionIds = faculty.sections.map((s) => s._id);
  const students = await Student.find({ section: { $in: sectionIds } });
  const marks = await Mark.find({ section: { $in: sectionIds }, faculty: req.user._id });
  const attendance = await Attendance.find({ section: { $in: sectionIds }, faculty: req.user._id, date: { $exists: true } });

  const sectionPerformance = faculty.sections.map((section) => {
    const sectionStudents = students.filter((s) => String(s.section) === String(section._id));
    const sectionMarks = marks.filter((m) => String(m.section) === String(section._id));
    const passPercent = sectionMarks.length ? (sectionMarks.filter((m) => m.passed).length / sectionMarks.length) * 100 : 0;

    return {
      sectionId: section._id,
      section: section.code,
      studentCount: sectionStudents.length,
      passPercent: Number(passPercent.toFixed(2))
    };
  });

  const topStudents = students
    .map((student) => ({
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      cgpa: student.metrics.at(-1)?.cgpa || 0,
      section: String(student.section || "")
    }))
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 10);

  const riskStudents = students
    .filter((student) => student.riskLevel !== "LOW")
    .map((student) => ({
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      riskLevel: student.riskLevel
    }));

  const marksDistribution = {
    above80: marks.filter((m) => m.total >= 80).length,
    between60And79: marks.filter((m) => m.total >= 60 && m.total < 80).length,
    below60: marks.filter((m) => m.total < 60).length
  };

  const attendanceStats = {
    present: attendance.filter((a) => a.status === "PRESENT").length,
    absent: attendance.filter((a) => a.status === "ABSENT").length
  };

  const passPercentage = marks.length ? Number(((marks.filter((m) => m.passed).length / marks.length) * 100).toFixed(2)) : 0;

  return res.status(200).json({
    success: true,
    data: {
      sectionPerformance,
      topStudents,
      riskStudents,
      charts: {
        marksDistribution,
        passPercentage,
        attendanceStats
      }
    }
  });
};

export const addResearch = async (req, res) => {
  const research = await Research.create({ ...req.body, faculty: req.user._id });
  return res.status(201).json({ success: true, data: research });
};
