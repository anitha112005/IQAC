import Student from "../models/Student.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import ReportLog from "../models/ReportLog.js";
import { buildExcelBuffer, buildPdfBuffer } from "../services/reportService.js";

const getReportRows = async (reportType, query) => {
  if (reportType === "STUDENT_PROGRESS") {
    const students = await Student.find(query.department ? { department: query.department } : {}).populate("department", "name code");
    return students.map((s) => {
      const latest = s.metrics.at(-1) || {};
      return {
        rollNo: s.rollNo,
        name: s.name,
        department: s.department?.code || "NA",
        cgpa: latest.cgpa || 0,
        attendancePercent: latest.attendancePercent || 0,
        backlogCount: latest.backlogCount || 0,
        riskLevel: s.riskLevel
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

  const students = await Student.find(query.department ? { department: query.department } : {});
  return students.map((s) => {
    const latest = s.metrics.at(-1) || {};
    return {
      rollNo: s.rollNo,
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

export const reportHistory = async (_, res) => {
  const logs = await ReportLog.find().populate("generatedBy", "name email role").sort({ createdAt: -1 }).limit(50);
  return res.status(200).json({ success: true, data: logs });
};
