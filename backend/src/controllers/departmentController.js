import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Achievement from "../models/Achievement.js";
import Student from "../models/Student.js";
import Section from "../models/Section.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import StudentAchievement from "../models/StudentAchievement.js";

export const createDepartment = async (req, res) => {
  const department = await Department.create(req.body);
  return res.status(201).json({ success: true, data: department });
};

export const listDepartments = async (_, res) => {
  const departments = await Department.find().populate("hod", "name email").sort({ name: 1 });
  return res.status(200).json({ success: true, data: departments });
};

export const addPlacement = async (req, res) => {
  const { departmentId } = req.params;
  const payload = { ...req.body, department: departmentId, enteredBy: req.user._id };

  const placement = await Placement.findOneAndUpdate(
    { department: departmentId, academicYear: req.body.academicYear },
    payload,
    { new: true, upsert: true }
  );

  return res.status(200).json({ success: true, data: placement });
};

export const addAchievement = async (req, res) => {
  const { departmentId } = req.params;
  const achievement = await Achievement.create({ ...req.body, department: departmentId });

  return res.status(201).json({ success: true, data: achievement });
};

export const departmentAnalytics = async (req, res) => {
  const { departmentId } = req.params;

  const students = await Student.find({ department: departmentId });
  const placements = await Placement.find({ department: departmentId });
  const achievements = await Achievement.find({ department: departmentId });

  const latestMetrics = students.map((s) => s.metrics.at(-1)).filter(Boolean);

  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
    : 0;

  const passPercent = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
    : 0;

  const backlogRate = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount > 0).length / latestMetrics.length) * 100
    : 0;

  const placementRate = placements.length
    ? placements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / placements.length
    : 0;

  return res.status(200).json({
    success: true,
    data: {
      studentCount: students.length,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(avgCgpa.toFixed(2)),
      backlogRate: Number(backlogRate.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      achievements: achievements.length
    }
  });
};

export const hodDepartmentDashboard = async (req, res) => {
  const { departmentId } = req.params;
  const department = await Department.findById(departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });

  const isOwnerHod = req.user.role === "hod" && String(req.user.department?._id || req.user.department) === String(departmentId);
  if (req.user.role !== "admin" && !isOwnerHod) {
    return res.status(403).json({ success: false, message: "Forbidden for this department" });
  }

  const [students, faculties, sections, placements, facultyAchievements, studentAchievements] = await Promise.all([
    Student.find({ department: departmentId }).populate("section", "name code"),
    Faculty.find({ department: departmentId }).populate("user", "name email"),
    Section.find({ department: departmentId }),
    Placement.find({ department: departmentId }).sort({ createdAt: -1 }),
    FacultyAchievement.find({ department: departmentId }).populate("faculty", "name email").sort({ date: -1 }).limit(20),
    StudentAchievement.find({ department: departmentId }).populate("student", "name rollNo").sort({ date: -1 }).limit(20)
  ]);

  const latestMetrics = students.map((s) => s.metrics.at(-1)).filter(Boolean);
  const passPercent = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
    : 0;
  const averageCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
    : 0;
  const riskStudentsPercent = students.length
    ? (students.filter((s) => s.riskLevel !== "LOW").length / students.length) * 100
    : 0;

  const topStudents = students
    .map((s) => ({
      id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      cgpa: s.metrics.at(-1)?.cgpa || 0,
      section: s.section?.code || "-"
    }))
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 5);

  const sectionPerformance = sections.map((section) => {
    const sectionStudents = students.filter((s) => String(s.section?._id || s.section) === String(section._id));
    const sectionLatest = sectionStudents.map((s) => s.metrics.at(-1)).filter(Boolean);
    const sectionCgpa = sectionLatest.length
      ? sectionLatest.reduce((sum, m) => sum + m.cgpa, 0) / sectionLatest.length
      : 0;
    const sectionPass = sectionLatest.length
      ? (sectionLatest.filter((m) => m.backlogCount === 0).length / sectionLatest.length) * 100
      : 0;

    return {
      sectionId: section._id,
      section: section.code,
      studentCount: sectionStudents.length,
      passPercent: Number(sectionPass.toFixed(2)),
      averageCgpa: Number(sectionCgpa.toFixed(2))
    };
  });

  const facultyContribution = faculties.map((faculty) => {
    const count = facultyAchievements.filter((f) => String(f.faculty?._id || f.faculty) === String(faculty.user?._id || faculty.user)).length;
    return {
      facultyId: faculty.user?._id || faculty.user,
      facultyName: faculty.user?.name || "Faculty",
      designation: faculty.designation,
      contributionCount: count
    };
  });

  const studentPerformanceTrends = students.map((student) => ({
    studentId: student._id,
    name: student.name,
    trend: student.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa, attendancePercent: m.attendancePercent }))
  }));

  return res.status(200).json({
    success: true,
    data: {
      overview: {
        departmentId,
        departmentName: department.name,
        totalStudents: students.length,
        totalFaculty: faculties.length,
        totalSections: sections.length
      },
      analytics: {
        passPercent: Number(passPercent.toFixed(2)),
        averageCgpa: Number(averageCgpa.toFixed(2)),
        riskStudentsPercent: Number(riskStudentsPercent.toFixed(2)),
        topStudents
      },
      comparisons: {
        sectionPerformance,
        facultyContribution,
        studentPerformanceTrends
      },
      achievements: {
        facultyAchievements,
        studentAchievements
      },
      placements
    }
  });
};
