import Student from "../models/Student.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Department from "../models/Department.js";
import ReportLog from "../models/ReportLog.js";
import { buildExcelBuffer, buildPdfBuffer } from "../services/reportService.js";

const getReportRows = async (reportType, query) => {
  const studentFilter = {};
  if (query.department) studentFilter.department = query.department;
  if (query.section) studentFilter.section = String(query.section).toUpperCase();

  if (reportType === "STUDENT_PROGRESS") {
    const students = await Student.find(studentFilter).populate("department", "name code");
    return students.map((s) => {
      const latest = s.metrics.at(-1) || {};
      return {
        rollNo: s.rollNo,
        name: s.name,
        section: s.section,
        department: s.department?.code || "NA",
        cgpa: latest.cgpa || 0,
        attendancePercent: latest.attendancePercent || 0,
        backlogCount: latest.backlogCount || 0,
        riskLevel: s.riskLevel
      };
    });
  }

  if (reportType === "SECTION_WISE") {
    const students = await Student.find(studentFilter);
    const map = new Map();

    students.forEach((s) => {
      const sec = s.section || "A";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec).push(s);
    });

    return Array.from(map.entries()).map(([section, list]) => {
      const latest = list.map((s) => s.metrics.at(-1)).filter(Boolean);
      const avgCgpa = latest.length ? latest.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / latest.length : 0;
      const passPercent = latest.length
        ? (latest.filter((m) => Number(m.backlogCount || 0) === 0).length / latest.length) * 100
        : 0;

      return {
        section,
        totalStudents: list.length,
        averageCgpa: Number(avgCgpa.toFixed(2)),
        passPercent: Number(passPercent.toFixed(2))
      };
    });
  }

  if (reportType === "PLACEMENT") {
    const placements = await Placement.find(query.department ? { department: query.department } : {}).populate("department", "name code");
    return placements.map((p) => ({
      department: p.department?.code || "NA",
      academicYear: p.academicYear,
      totalEligible: p.totalEligible,
      totalPlaced: p.totalPlaced,
      placementRate: p.totalEligible ? Number(((p.totalPlaced / p.totalEligible) * 100).toFixed(2)) : 0
    }));
  }

  if (reportType === "FACULTY_CONTRIBUTION") {
    const research = await Research.find(query.department ? { department: query.department } : {}).populate("department", "name code").populate("faculty", "name email");
    return research.map((r) => ({
      faculty: r.faculty?.name || "Unknown",
      department: r.department?.code || "NA",
      publicationType: r.publicationType,
      title: r.title,
      accreditationCriteria: r.accreditationCriteria
    }));
  }

  const students = await Student.find(studentFilter);
  return students.map((s) => {
    const latest = s.metrics.at(-1) || {};
    return {
      rollNo: s.rollNo,
      section: s.section,
      semester: latest.semester || 0,
      cgpa: latest.cgpa || 0,
      backlogCount: latest.backlogCount || 0
    };
  });
};

export const generateReport = async (req, res) => {
  const { reportType = "STUDENT_PROGRESS", format = "PDF", ...filters } = req.body;

  const rows = await getReportRows(reportType, filters);

  await ReportLog.create({
    reportType,
    generatedBy: req.user._id,
    filters,
    format
  });

  const filename = `${reportType.toLowerCase()}_${Date.now()}.${format === "PDF" ? "pdf" : "xlsx"}`;

  if (format === "EXCEL") {
    const buffer = await buildExcelBuffer(reportType, rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer(reportType, rows);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(buffer);
};

const sendDownloadReport = async ({ req, res, reportType, rows, defaultFilenamePrefix }) => {
  const format = String(req.query.format || "PDF").toUpperCase() === "EXCEL" ? "EXCEL" : "PDF";
  const extension = format === "EXCEL" ? "xlsx" : "pdf";
  const filename = `${defaultFilenamePrefix}_${Date.now()}.${extension}`;

  await ReportLog.create({
    reportType,
    generatedBy: req.user._id,
    filters: req.query || {},
    format
  });

  if (format === "EXCEL") {
    const buffer = await buildExcelBuffer(reportType, rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer(reportType, rows);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(buffer);
};

export const facultyReport = async (req, res) => {
  const faculties = await Faculty.find()
    .populate("department", "name code")
    .sort({ name: 1 });

  const facultyUserIds = faculties.map((f) => f.user).filter(Boolean);
  const [researchRows, achievementRows] = await Promise.all([
    Research.find({ faculty: { $in: facultyUserIds } }).populate("faculty", "name"),
    FacultyAchievement.find({ faculty: { $in: facultyUserIds } }).populate("faculty", "name")
  ]);

  const rows = faculties.map((faculty) => {
    const userId = String(faculty.user || "");
    const publicationCount = Number(faculty.publications || 0);
    const researchCount = researchRows.filter((r) => String(r.faculty?._id || r.faculty || "") === userId).length;
    const achievementsCount = achievementRows.filter((a) => String(a.faculty?._id || a.faculty || "") === userId).length;
    const teachingLoad = (faculty.sections || []).length * (faculty.subjects || []).length;

    return {
      facultyName: faculty.name,
      employeeId: faculty.employeeId,
      department: faculty.department?.code || faculty.department?.name || "NA",
      designation: faculty.designation || "Assistant Professor",
      publications: publicationCount,
      achievements: achievementsCount,
      teachingSections: (faculty.sections || []).join(", ") || "-",
      subjectsHandled: (faculty.subjects || []).map((s) => s.subjectName).join(", ") || "-",
      teachingAnalyticsScore: Number((publicationCount * 0.25 + achievementsCount * 0.25 + researchCount * 0.25 + teachingLoad * 0.25).toFixed(2))
    };
  });

  return sendDownloadReport({
    req,
    res,
    reportType: "FACULTY_ACCREDITATION",
    rows,
    defaultFilenamePrefix: "faculty_accreditation_report"
  });
};

export const departmentReport = async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });

  const rows = await Promise.all(
    departments.map(async (department) => {
      const [students, faculties, researchRows] = await Promise.all([
        Student.find({ department: department._id }),
        Faculty.find({ department: department._id }),
        Research.find({ department: department._id })
      ]);

      const latestMetrics = students.map((s) => s.metrics?.at(-1)).filter(Boolean);
      const passPercentage = latestMetrics.length
        ? (latestMetrics.filter((m) => Number(m.backlogCount || 0) === 0).length / latestMetrics.length) * 100
        : 0;
      const averageCgpa = latestMetrics.length
        ? latestMetrics.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / latestMetrics.length
        : 0;

      return {
        department: department.code,
        departmentName: department.name,
        studentPassPercentage: Number(passPercentage.toFixed(2)),
        averageCgpa: Number(averageCgpa.toFixed(2)),
        facultyCount: faculties.length,
        researchOutput: researchRows.length,
        studentsCount: students.length
      };
    })
  );

  return sendDownloadReport({
    req,
    res,
    reportType: "DEPARTMENT_ACCREDITATION",
    rows,
    defaultFilenamePrefix: "department_accreditation_report"
  });
};

export const studentReport = async (req, res) => {
  const students = await Student.find().populate("department", "name code").sort({ rollNo: 1 });

  const rows = students.map((student) => {
    const latest = student.metrics?.at(-1) || {};
    return {
      rollNo: student.rollNo,
      studentName: student.name,
      department: student.department?.code || "NA",
      section: student.section,
      semester: student.currentSemester,
      sgpa: Number(latest.sgpa || 0),
      cgpa: Number(latest.cgpa || 0),
      attendancePercent: Number(latest.attendancePercent || 0),
      backlogCount: Number(latest.backlogCount || 0),
      riskLevel: student.riskLevel
    };
  });

  return sendDownloadReport({
    req,
    res,
    reportType: "STUDENT_ACCREDITATION",
    rows,
    defaultFilenamePrefix: "student_accreditation_report"
  });
};

export const reportHistory = async (_, res) => {
  const logs = await ReportLog.find().populate("generatedBy", "name email role").sort({ createdAt: -1 }).limit(50);
  return res.status(200).json({ success: true, data: logs });
};
