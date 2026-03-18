import Student from "../models/Student.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Department from "../models/Department.js";
import ReportLog from "../models/ReportLog.js";
import { buildExcelBuffer, buildPdfBuffer } from "../services/reportService.js";
import {
  generateStudentProgressAnalysis,
  generateDepartmentPerformanceAnalysis,
  generateCGPADistributionAnalysis,
  generateBacklogAnalysis,
  generatePlacementForecast,
  generateFacultyContributionSummary
} from "../services/llmService.js";

// ─── SAFE PARSE HELPERS ───────────────────────────────────────
// All values from summaryRows are strings. LLM functions need numbers.
const toFloat = (val) => {
  if (typeof val === "number") return val;
  return parseFloat(String(val ?? "0").replace(/[^0-9.-]/g, "")) || 0;
};
const toInt = (val) => {
  if (typeof val === "number") return Math.round(val);
  return parseInt(String(val ?? "0").replace(/[^0-9]/g, "")) || 0;
};

// ─── getReportRows ────────────────────────────────────────────
const getReportRows = async (reportType, query) => {
  const studentFilter = {};
  if (query.department) studentFilter.department = query.department;
  if (query.section) studentFilter.section = String(query.section).toUpperCase();
  const hasAcademicYear = !!query.academicYear;

  // ── STUDENT_PROGRESS ────────────────────────────────────────
  if (reportType === "STUDENT_PROGRESS") {
    let students = await Student.find(studentFilter)
      .populate("department", "name code")
      .lean();

    if (hasAcademicYear) {
      students = students.filter(s =>
        s.metrics?.some(m => m.academicYear === query.academicYear)
      );
    }

    let highRiskCount = 0, medRiskCount = 0, lowRiskCount = 0;
    let attendanceShortage = 0, totalCgpa = 0, totalBacklogs = 0;

    const rows = students.map(s => {
      const latest = s.metrics?.at(-1) || {};
      if (s.riskLevel === "HIGH") highRiskCount++;
      else if (s.riskLevel === "MEDIUM") medRiskCount++;
      else lowRiskCount++;
      if ((latest.attendancePercent || 0) < 75) attendanceShortage++;
      totalCgpa += latest.cgpa || 0;
      totalBacklogs += latest.backlogCount || 0;
      return {
        rollNo: s.rollNo,
        name: s.name,
        department: s.department?.code || "NA",
        semester: latest.semester || "-",
        batch: s.batch,
        cgpa: latest.cgpa || 0,
        sgpa: latest.sgpa || 0,
        attendancePercent: latest.attendancePercent || 0,
        backlogCount: latest.backlogCount || 0,
        riskLevel: s.riskLevel
      };
    });

    const avgCgpa = students.length
      ? (totalCgpa / students.length).toFixed(2)
      : "0.00";

    return {
      rows,
      columns: [
        { header: "Roll No", key: "rollNo" },
        { header: "Student Name", key: "name" },
        { header: "Dept", key: "department" },
        { header: "Sem", key: "semester" },
        { header: "Batch", key: "batch" },
        { header: "CGPA", key: "cgpa" },
        { header: "SGPA", key: "sgpa" },
        { header: "Att %", key: "attendancePercent" },
        { header: "Backlogs", key: "backlogCount" },
        { header: "Risk Level", key: "riskLevel" }
      ],
      summaryRows: [
        { label: "Total Students", value: students.length },
        { label: "High Risk Students", value: `${highRiskCount} (${students.length ? ((highRiskCount / students.length) * 100).toFixed(1) : 0}%)` },
        { label: "Average CGPA", value: avgCgpa },
        { label: "Low Attendance (<75%)", value: attendanceShortage },
        { label: "Total Backlogs", value: totalBacklogs }
      ],
      // Expose raw numbers for LLM — not shown in PDF summary
      _llm: {
        totalStudents: students.length,
        highRisk: highRiskCount,
        mediumRisk: medRiskCount,
        lowRisk: lowRiskCount,
        averageCgpa: parseFloat(avgCgpa),
        attendanceShortage,
        totalBacklogs
      },
      subtitle: "Student Academic Progress — Latest Semester Data"
    };
  }

  // ── DEPARTMENT_PERFORMANCE ───────────────────────────────────
  if (reportType === "DEPARTMENT_PERFORMANCE") {
    // BUG 5 FIX: Single bulk queries instead of N+1 per department
    const [departments, allStudents, allPlacements, allResearch, allAchievements] =
      await Promise.all([
        Department.find().lean(),
        Student.find().lean(),
        Placement.find().lean(),
        Research.find().lean(),
        FacultyAchievement.find().lean()
      ]);

    let students = allStudents;
    let placements = allPlacements;
    if (hasAcademicYear) {
      students = students.filter(s => s.metrics?.some(m => m.academicYear === query.academicYear));
      placements = placements.filter(p => p.academicYear === query.academicYear);
    }

    const rawRows = departments.map(d => {
      const sid = String(d._id);
      const dStudents = students.filter(s => String(s.department) === sid);
      const latestMetrics = dStudents.map(s => s.metrics?.at(-1)).filter(Boolean);
      const avgCgpa = latestMetrics.length
        ? latestMetrics.reduce((s, m) => s + (m.cgpa || 0), 0) / latestMetrics.length
        : 0;
      const cleanPass = latestMetrics.filter(m => (m.backlogCount || 0) === 0).length;
      const passPercent = latestMetrics.length ? (cleanPass / latestMetrics.length) * 100 : 0;
      const backlogRate = latestMetrics.length
        ? ((latestMetrics.length - cleanPass) / latestMetrics.length) * 100
        : 0;
      const dPlacements = placements.filter(p => String(p.department) === sid);
      let placementRate = 0;
      if (dPlacements.length) {
        const eligible = dPlacements.reduce((s, p) => s + (p.totalEligible || 0), 0);
        const placed = dPlacements.reduce((s, p) => s + (p.totalPlaced || 0), 0);
        placementRate = eligible ? (placed / eligible) * 100 : 0;
      }
      const rCount = allResearch.filter(r => String(r.department) === sid).length;
      const aCount = allAchievements.filter(a => String(a.department) === sid).length;
      const score = avgCgpa * 10 * 0.35 + passPercent * 0.35 + placementRate * 0.3;

      return {
        department: d.name,
        code: d.code,
        students: dStudents.length,
        avgCgpa: Number(avgCgpa.toFixed(2)),
        passPercent: Number(passPercent.toFixed(1)),
        backlogRate: Number(backlogRate.toFixed(1)),
        placementRate: Number(placementRate.toFixed(1)),
        research: rCount,
        achievements: aCount,
        score: Number(score.toFixed(2))
      };
    });

    rawRows.sort((a, b) => b.score - a.score);
    const rows = rawRows.map((r, i) => ({ rank: i + 1, ...r }));
    const institutionAvgCgpa = rows.length
      ? rows.reduce((s, r) => s + r.avgCgpa, 0) / rows.length
      : 0;

    return {
      rows,
      columns: [
        { header: "Rank", key: "rank" },
        { header: "Department Name", key: "department" },
        { header: "Code", key: "code" },
        { header: "Students", key: "students" },
        { header: "Avg CGPA", key: "avgCgpa" },
        { header: "Pass %", key: "passPercent" },
        { header: "Backlog Rate %", key: "backlogRate" },
        { header: "Placement Rate %", key: "placementRate" },
        { header: "Research Output", key: "research" },
        { header: "Composite Score", key: "score" }
      ],
      summaryRows: [
        { label: "Total Departments", value: departments.length },
        { label: "Institution Average CGPA", value: institutionAvgCgpa.toFixed(2) },
        { label: "Best Department", value: rows[0]?.department || "NA" },
        { label: "Area for Improvement (Weakest Dept)", value: rows.at(-1)?.department || "NA" }
      ],
      subtitle: "Department Performance Comparison — Composite Rankings"
    };
  }

  // ── CGPA_DISTRIBUTION ────────────────────────────────────────
  if (reportType === "CGPA_DISTRIBUTION") {
    let students = await Student.find(studentFilter).lean();
    if (hasAcademicYear) {
      students = students.filter(s =>
        s.metrics?.some(m => m.academicYear === query.academicYear)
      );
    }

    const bands = { below6: 0, sixToSeven: 0, sevenToEight: 0, eightToNine: 0, above9: 0 };
    let totalCgpa = 0, belowNBAThreshold = 0;  // BUG 2 FIX: exact count
    const cgpas = [];

    students.forEach(s => {
      const cgpa = s.metrics?.at(-1)?.cgpa || 0;
      if (cgpa > 0) {
        cgpas.push(cgpa);
        // BUG 2 FIX: count exact students below 6.5, not approximated half
        if (cgpa < 6.5) belowNBAThreshold++;
      }
      totalCgpa += cgpa;
      if (cgpa < 6.0) bands.below6++;
      else if (cgpa < 7.0) bands.sixToSeven++;
      else if (cgpa < 8.0) bands.sevenToEight++;
      else if (cgpa < 9.0) bands.eightToNine++;
      else bands.above9++;
    });

    cgpas.sort((a, b) => a - b);
    const median = cgpas.length ? cgpas[Math.floor(cgpas.length / 2)] : 0;
    const avg = students.length ? totalCgpa / students.length : 0;
    const total = students.length || 1;

    const rows = [
      { range: "Below 6.0", count: bands.below6, percent: ((bands.below6 / total) * 100).toFixed(1), status: "NON-COMPLIANT" },
      { range: "6.0 to 6.99", count: bands.sixToSeven, percent: ((bands.sixToSeven / total) * 100).toFixed(1), status: "AT RISK / MARGINAL" },
      { range: "7.0 to 7.99", count: bands.sevenToEight, percent: ((bands.sevenToEight / total) * 100).toFixed(1), status: "COMPLIANT" },
      { range: "8.0 to 8.99", count: bands.eightToNine, percent: ((bands.eightToNine / total) * 100).toFixed(1), status: "COMPLIANT +" },
      { range: "9.0 and above", count: bands.above9, percent: ((bands.above9 / total) * 100).toFixed(1), status: "EXEMPLARY" }
    ];

    return {
      rows,
      columns: [
        { header: "CGPA Range", key: "range" },
        { header: "Student Count", key: "count" },
        { header: "Percentage of Total %", key: "percent" },
        { header: "NBA Compliance Status", key: "status" }
      ],
      summaryRows: [
        { label: "Total Students Evaluated", value: students.length },
        { label: "Institution Average CGPA", value: avg.toFixed(2) },
        { label: "Institution Median CGPA", value: median.toFixed(2) },
        { label: "Highest / Lowest CGPA", value: `${cgpas.at(-1) || 0} / ${cgpas[0] || 0}` },
        { label: "Below NBA Threshold (<6.5)", value: `${belowNBAThreshold} students (${((belowNBAThreshold / total) * 100).toFixed(1)}%)` },
        { label: "NBA Compliance Verdict", value: avg >= 6.5 ? "COMPLIANT" : "NON-COMPLIANT" }
      ],
      // Expose raw numbers for LLM
      _llm: {
        totalStudents: students.length,
        averageCgpa: parseFloat(avg.toFixed(2)),
        medianCgpa: parseFloat(median.toFixed(2)),
        highestCgpa: cgpas.at(-1) || 0,
        lowestCgpa: cgpas[0] || 0,
        belowNBAThreshold,
        below_6: bands.below6,
        six_to_seven: bands.sixToSeven,
        seven_to_eight: bands.sevenToEight,
        eight_to_nine: bands.eightToNine,
        above_nine: bands.above9
      },
      subtitle: "CGPA Distribution Analysis — NBA Threshold Compliance"
    };
  }

  // ── BACKLOG_ANALYSIS ─────────────────────────────────────────
  if (reportType === "BACKLOG_ANALYSIS") {
    let allStudents = await Student.find(studentFilter)
      .populate("department", "name code")
      .lean();

    if (hasAcademicYear) {
      allStudents = allStudents.filter(s =>
        s.metrics?.some(m => m.academicYear === query.academicYear)
      );
    }

    let clean = 0, one = 0, two = 0, threePlus = 0;
    const deptStats = {};
    const riskRegister = [];

    allStudents.forEach(s => {
      const m = s.metrics?.at(-1) || {};
      const bl = m.backlogCount || 0;
      const dept = s.department?.code || "NA";

      if (!deptStats[dept]) {
        deptStats[dept] = { name: dept, total: 0, affected: 0, instanceTotal: 0, cgpaSum: 0 };
      }
      deptStats[dept].total++;

      if (bl === 0) clean++;
      else if (bl === 1) one++;
      else if (bl === 2) two++;
      else threePlus++;

      if (bl > 0) {
        deptStats[dept].affected++;
        deptStats[dept].instanceTotal += bl;
        deptStats[dept].cgpaSum += m.cgpa || 0;
        riskRegister.push({
          rollNo: s.rollNo,
          name: s.name,
          department: dept,
          semester: m.semester || "-",
          backlogs: bl,
          cgpa: m.cgpa || 0,
          attendance: m.attendancePercent || 0,
          risk: s.riskLevel
        });
      }
    });

    const deptRows = Object.values(deptStats)
      .map(d => ({
        name: d.name,
        total: d.total,
        affected: d.affected,
        instances: d.instanceTotal,
        rate: d.total ? Number(((d.affected / d.total) * 100).toFixed(1)) : 0,
        avgCgpa: d.affected ? Number((d.cgpaSum / d.affected).toFixed(2)) : 0
      }))
      .sort((a, b) => b.instances - a.instances);

    riskRegister.sort((a, b) => b.backlogs - a.backlogs || a.cgpa - b.cgpa);

    const worstDept = deptRows[0] || { name: "NA", instances: 0 };
    const cleanRate = allStudents.length
      ? ((clean / allStudents.length) * 100).toFixed(1)
      : 0;

    return {
      rows: riskRegister,
      columns: [
        { header: "Roll Number", key: "rollNo" },
        { header: "Student Name", key: "name" },
        { header: "Department", key: "department" },
        { header: "Semester", key: "semester" },
        { header: "Backlogs", key: "backlogs" },
        { header: "CGPA", key: "cgpa" },
        { header: "Attendance %", key: "attendance" },
        { header: "Risk Flag", key: "risk" }
      ],
      summaryRows: [
        { label: "Clean Pass Rate", value: `${cleanRate}% (${clean} students)` },
        { label: "Total Students with Backlogs", value: `${allStudents.length - clean} students` },
        { label: "Backlog Breakdown", value: `1 Backlog: ${one} | 2 Backlogs: ${two} | 3+ Backlogs: ${threePlus}` },
        { label: "Critical Department", value: `${worstDept.name} (${worstDept.instances} total backlog instances)` }
      ],
      // BUG 1 FIX: Expose real backlog counts for LLM — previously all zeros
      _llm: {
        totalStudents: allStudents.length,
        summary: {
          studentsWithNoBacklogs: clean,
          studentsWithOneBacklog: one,
          studentsWithTwoBacklogs: two,
          studentsWithThreePlus: threePlus
        },
        byDepartment: deptRows,
        bySemester: [],
        topOffenders: riskRegister.slice(0, 10)
      },
      subtitle: "Backlog Analysis Report — Academic Risk Assessment"
    };
  }

  // ── PLACEMENT ────────────────────────────────────────────────
  if (reportType === "PLACEMENT") {
    const placementQuery = query.department ? { department: query.department } : {};
    if (hasAcademicYear) placementQuery.academicYear = query.academicYear;

    const placements = await Placement.find(placementQuery)
      .populate("department", "name code")
      .lean();

    const byYear = {};
    let totalE = 0, totalP = 0, maxPackage = 0;
    const recruiters = new Set();

    const rows = placements.map(p => {
      const year = p.academicYear || "Unknown";
      if (!byYear[year]) byYear[year] = { year, e: 0, p: 0, h: 0, ms: 0, mc: 0 };
      byYear[year].e += p.totalEligible || 0;
      byYear[year].p += p.totalPlaced || 0;
      if ((p.highestPackageLPA || 0) > byYear[year].h) byYear[year].h = p.highestPackageLPA;
      if ((p.highestPackageLPA || 0) > maxPackage) maxPackage = p.highestPackageLPA;
      byYear[year].ms += p.medianPackageLPA || 0;
      byYear[year].mc++;
      totalE += p.totalEligible || 0;
      totalP += p.totalPlaced || 0;
      if (p.majorRecruiters) p.majorRecruiters.forEach(r => recruiters.add(r));

      return {
        department: p.department?.code || "NA",
        year: p.academicYear,
        eligible: p.totalEligible || 0,
        placed: p.totalPlaced || 0,
        rate: p.totalEligible
          ? Number(((p.totalPlaced / p.totalEligible) * 100).toFixed(1))
          : 0,
        highest: p.highestPackageLPA || 0,
        median: p.medianPackageLPA || 0,
        recruiters: (p.majorRecruiters || []).join(", ")
      };
    }).sort((a, b) => b.rate - a.rate);

    const overallRate = totalE ? ((totalP / totalE) * 100).toFixed(1) : 0;
    let bestYear = "NA", bestRate = 0;
    Object.values(byYear).forEach(y => {
      const rt = y.e ? (y.p / y.e) * 100 : 0;
      if (rt > bestRate) { bestRate = rt; bestYear = y.year; }
    });

    const totalPlaced = rows.reduce((s, r) => s + r.placed, 0);
    const totalEligible = rows.reduce((s, r) => s + r.eligible, 0);
    const avgMedian = rows.length
      ? rows.reduce((s, r) => s + r.median, 0) / rows.length
      : 0;

    return {
      rows,
      columns: [
        { header: "Department", key: "department" },
        { header: "Academic Year", key: "year" },
        { header: "Eligible Students", key: "eligible" },
        { header: "Placed Students", key: "placed" },
        { header: "Placement Rate %", key: "rate" },
        { header: "Highest Package", key: "highest" },
        { header: "Median Package", key: "median" },
        { header: "Major Recruiters", key: "recruiters" }
      ],
      summaryRows: [
        { label: "Overall Institutional Placement Rate", value: `${overallRate}%` },
        { label: "Total Eligible / Placed", value: `${totalE} / ${totalP}` },
        { label: "Highest Package Recorded", value: `${maxPackage} LPA` },
        { label: "Best Academic Year", value: `${bestYear} (${bestRate.toFixed(1)}% rate)` },
        { label: "Top Recruiting Companies", value: Array.from(recruiters).slice(0, 5).join(", ") || "None" }
      ],
      // BUG 6 FIX: LLM gets real numbers not a "82.5%" string
      _llm: {
        institutionSummary: {
          totalEligible: totalEligible,
          totalPlaced: totalPlaced,
          overallPlacementRate: parseFloat(overallRate),
          topPackage: maxPackage,
          averageMedianPackage: parseFloat(avgMedian.toFixed(2))
        },
        byDepartment: rows,
        topRecruiters: Array.from(recruiters).slice(0, 10)
      },
      subtitle: "Placement Statistics Report — Department and Year Analysis"
    };
  }

  // ── FACULTY_CONTRIBUTION ─────────────────────────────────────
  if (reportType === "FACULTY_CONTRIBUTION") {
    const researchQuery = query.department ? { department: query.department } : {};
    if (hasAcademicYear) {
      const startYear = parseInt((query.academicYear || "").split("-")[0]);
      if (!isNaN(startYear)) {
        researchQuery.publishedOn = {
          $gte: new Date(`${startYear}-06-01`),
          $lte: new Date(`${startYear + 1}-05-31`)
        };
      }
    }

    const [research, faculty] = await Promise.all([
      Research.find(researchQuery)
        .populate("department", "name code")
        .populate("faculty", "name email")
        .lean(),
      Faculty.find(query.department ? { department: query.department } : {})
        .populate("department", "name code")
        .lean()
    ]);

    const facMap = {};
    faculty.forEach(f => {
      facMap[f._id.toString()] = {
        name: f.name, dept: f.department?.code || "NA",
        total: 0, journal: 0, conf: 0, patent: 0
      };
    });
    research.forEach(r => {
      const fid = r.faculty?._id?.toString();
      if (!fid) return;
      if (!facMap[fid]) {
        facMap[fid] = {
          name: r.faculty.name, dept: r.department?.code || "NA",
          total: 0, journal: 0, conf: 0, patent: 0
        };
      }
      facMap[fid].total++;
      if (r.publicationType === "Journal") facMap[fid].journal++;
      else if (r.publicationType === "Conference") facMap[fid].conf++;
      else if (r.publicationType === "Patent") facMap[fid].patent++;
    });

    const rows = Object.values(facMap)
      .map(f => ({
        name: f.name,
        department: f.dept,
        total: f.total,
        journal: f.journal,
        conference: f.conf,
        patent: f.patent,
        percent: research.length
          ? Number(((f.total / research.length) * 100).toFixed(1))
          : 0,
        status: f.total === 0 ? "NEEDS IMPROVEMENT" : "ACTIVE"
      }))
      .sort((a, b) => b.total - a.total);

    const ratio = faculty.length
      ? (research.length / faculty.length).toFixed(2)
      : "0.00";
    const verdict = parseFloat(ratio) >= 0.33 ? "COMPLIANT" : "NON-COMPLIANT";

    return {
      rows,
      columns: [
        { header: "Faculty Name", key: "name" },
        { header: "Department", key: "department" },
        { header: "Total Publications", key: "total" },
        { header: "Journals", key: "journal" },
        { header: "Conferences", key: "conference" },
        { header: "Patents", key: "patent" },
        { header: "Contribution %", key: "percent" },
        { header: "Performance Flag", key: "status" }
      ],
      summaryRows: [
        { label: "Total Publications", value: research.length },
        { label: "Total Faculty Count", value: faculty.length },
        { label: "Publications per Faculty Ratio", value: `${ratio} (NBA Requirement: ≥0.33)` },
        { label: "Institution NBA Criterion 4 Verdict", value: verdict },
        { label: "Zero-Publication Faculty", value: rows.filter(r => r.total === 0).length }
      ],
      _llm: {
        department: "Institution",
        totalFaculty: faculty.length,
        totalPublications: research.length,
        byType: {
          Journal: rows.reduce((s, r) => s + r.journal, 0),
          Conference: rows.reduce((s, r) => s + r.conference, 0),
          Patent: rows.reduce((s, r) => s + r.patent, 0)
        },
        byFaculty: rows.map(r => ({ faculty: r.name, count: r.total })),
        publications: research.slice(0, 5).map(r => ({
          faculty: r.faculty?.name || "Unknown",
          title: r.title,
          publicationType: r.publicationType,
          journalOrConference: r.journalOrConference || ""
        }))
      },
      subtitle: "Faculty Contribution Report — NBA Criterion 4 Assessment"
    };
  }

  return { rows: [], columns: [], summaryRows: [], _llm: {}, subtitle: "" };
};

// ─── generateReport ───────────────────────────────────────────
export const generateReport = async (req, res) => {
  const { reportType = "STUDENT_PROGRESS", format = "PDF", ...filters } = req.body;

  const result = await getReportRows(reportType, filters);
  const { rows, columns, summaryRows, subtitle, _llm = {} } = result;

  await ReportLog.create({
    reportType,
    generatedBy: req.user._id,
    filters,
    format
  });

  const filename = `${reportType.toLowerCase()}_${Date.now()}.${format === "PDF" ? "pdf" : "xlsx"
    }`;

  if (format === "EXCEL") {
    const buffer = await buildExcelBuffer(reportType, rows, columns);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  }

  // ── LLM Analysis for PDF ─────────────────────────────────────
  let aiAnalysis = null;
  try {
    if (reportType === "STUDENT_PROGRESS") {
      // BUG 3 FIX: averageCgpa is a parsed float not a raw string
      aiAnalysis = await generateStudentProgressAnalysis({
        totalStudents: _llm.totalStudents,
        highRisk: _llm.highRisk,
        mediumRisk: _llm.mediumRisk,
        lowRisk: _llm.lowRisk,
        averageCgpa: _llm.averageCgpa,       // float now
        attendanceShortage: _llm.attendanceShortage,
        totalBacklogs: _llm.totalBacklogs,
        semesterWise: [],
        topDepartment: "NA",
        bottomDepartment: "NA"
      });
    }
    else if (reportType === "DEPARTMENT_PERFORMANCE") {
      aiAnalysis = await generateDepartmentPerformanceAnalysis(
        rows.map(r => ({
          name: r.department,
          code: r.code,
          score: r.score,
          averageCgpa: r.avgCgpa,
          passPercent: r.passPercent,
          placementRate: r.placementRate,
          researchCount: r.research,
          achievementCount: r.achievements
        }))
      );
    }
    else if (reportType === "CGPA_DISTRIBUTION") {
      // BUG 3 FIX: all values are floats not strings
      aiAnalysis = await generateCGPADistributionAnalysis(_llm);
    }
    else if (reportType === "BACKLOG_ANALYSIS") {
      // BUG 1 FIX: _llm now contains real counts not zeros
      aiAnalysis = await generateBacklogAnalysis(_llm);
    }
    else if (reportType === "PLACEMENT") {
      // BUG 6 FIX: _llm.institutionSummary.overallPlacementRate is a float
      aiAnalysis = await generatePlacementForecast(_llm);
    }
    else if (reportType === "FACULTY_CONTRIBUTION") {
      aiAnalysis = await generateFacultyContributionSummary(_llm);
    }
  } catch (err) {
    console.error(`AI Analysis failed for ${reportType}:`, err.message);
  }

  const reportMeta = { subtitle, columns, summaryRows, aiAnalysis };
  const pdfBuffer = await buildPdfBuffer(reportType, rows, reportMeta);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(pdfBuffer);
};

// ─── sendDownloadReport (BUG 4 FIX: accepts columns) ──────────
const sendDownloadReport = async ({
  req, res, reportType, rows, columns = [], defaultFilenamePrefix
}) => {
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
    // BUG 4 FIX: pass columns so Excel has readable headers
    const buffer = await buildExcelBuffer(reportType, rows, columns);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer(reportType, rows, { columns });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(buffer);
};

// ─── facultyReport ────────────────────────────────────────────
export const facultyReport = async (req, res) => {
  const faculties = await Faculty.find()
    .populate("department", "name code")
    .sort({ name: 1 })
    .lean();

  const facultyUserIds = faculties.map(f => f.user).filter(Boolean);
  const [researchRows, achievementRows] = await Promise.all([
    Research.find({ faculty: { $in: facultyUserIds } }).populate("faculty", "name").lean(),
    FacultyAchievement.find({ faculty: { $in: facultyUserIds } }).populate("faculty", "name").lean()
  ]);

  const columns = [
    { header: "Faculty Name", key: "facultyName" },
    { header: "Employee ID", key: "employeeId" },
    { header: "Department", key: "department" },
    { header: "Designation", key: "designation" },
    { header: "Publications", key: "publications" },
    { header: "Achievements", key: "achievements" },
    { header: "Teaching Sections", key: "teachingSections" },
    { header: "Subjects Handled", key: "subjectsHandled" },
    { header: "Analytics Score", key: "teachingAnalyticsScore" }
  ];

  const rows = faculties.map(faculty => {
    const userId = String(faculty.user || "");
    const publicationCount = Number(faculty.publications || 0);
    const researchCount = researchRows.filter(r => String(r.faculty?._id || r.faculty || "") === userId).length;
    const achievementsCount = achievementRows.filter(a => String(a.faculty?._id || a.faculty || "") === userId).length;
    const teachingLoad = (faculty.sections || []).length * (faculty.subjects || []).length;

    return {
      facultyName: faculty.name,
      employeeId: faculty.employeeId,
      department: faculty.department?.code || faculty.department?.name || "NA",
      designation: faculty.designation || "Assistant Professor",
      publications: publicationCount,
      achievements: achievementsCount,
      teachingSections: (faculty.sections || []).join(", ") || "-",
      subjectsHandled: (faculty.subjects || []).map(s => s.subjectName).join(", ") || "-",
      teachingAnalyticsScore: Number((publicationCount * 0.25 + achievementsCount * 0.25 + researchCount * 0.25 + teachingLoad * 0.25).toFixed(2))
    };
  });

  return sendDownloadReport({
    req, res,
    reportType: "FACULTY_ACCREDITATION",
    rows, columns,
    defaultFilenamePrefix: "faculty_accreditation_report"
  });
};

// ─── departmentReport (BUG 5 FIX: single bulk queries) ────────
export const departmentReport = async (req, res) => {
  const departments = await Department.find().sort({ name: 1 }).lean();

  // Fetch all in parallel — no N+1
  const [allStudents, allFaculties, allResearch] = await Promise.all([
    Student.find().lean(),
    Faculty.find().lean(),
    Research.find().lean()
  ]);

  const columns = [
    { header: "Department Code", key: "department" },
    { header: "Department Name", key: "departmentName" },
    { header: "Student Count", key: "studentsCount" },
    { header: "Faculty Count", key: "facultyCount" },
    { header: "Pass Percentage", key: "studentPassPercentage" },
    { header: "Average CGPA", key: "averageCgpa" },
    { header: "Research Output", key: "researchOutput" }
  ];

  const rows = departments.map(department => {
    const sid = String(department._id);
    const students = allStudents.filter(s => String(s.department) === sid);
    const faculties = allFaculties.filter(f => String(f.department) === sid);
    const researchRows = allResearch.filter(r => String(r.department) === sid);
    const latestMetrics = students.map(s => s.metrics?.at(-1)).filter(Boolean);
    const passPercentage = latestMetrics.length
      ? (latestMetrics.filter(m => Number(m.backlogCount || 0) === 0).length / latestMetrics.length) * 100
      : 0;
    const averageCgpa = latestMetrics.length
      ? latestMetrics.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / latestMetrics.length
      : 0;

    return {
      department: department.code,
      departmentName: department.name,
      studentsCount: students.length,
      facultyCount: faculties.length,
      studentPassPercentage: Number(passPercentage.toFixed(2)),
      averageCgpa: Number(averageCgpa.toFixed(2)),
      researchOutput: researchRows.length
    };
  });

  return sendDownloadReport({
    req, res,
    reportType: "DEPARTMENT_ACCREDITATION",
    rows, columns,
    defaultFilenamePrefix: "department_accreditation_report"
  });
};

// ─── studentReport ────────────────────────────────────────────
export const studentReport = async (req, res) => {
  const students = await Student.find()
    .populate("department", "name code")
    .sort({ rollNo: 1 })
    .lean();

  const columns = [
    { header: "Roll No", key: "rollNo" },
    { header: "Student Name", key: "studentName" },
    { header: "Department", key: "department" },
    { header: "Section", key: "section" },
    { header: "Semester", key: "semester" },
    { header: "SGPA", key: "sgpa" },
    { header: "CGPA", key: "cgpa" },
    { header: "Attendance %", key: "attendancePercent" },
    { header: "Backlogs", key: "backlogCount" },
    { header: "Risk Level", key: "riskLevel" }
  ];

  const rows = students.map(student => {
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
    req, res,
    reportType: "STUDENT_ACCREDITATION",
    rows, columns,
    defaultFilenamePrefix: "student_accreditation_report"
  });
};

// ─── reportHistory ────────────────────────────────────────────
export const reportHistory = async (_, res) => {
  const logs = await ReportLog.find()
    .populate("generatedBy", "name email role")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.status(200).json({ success: true, data: logs });
};