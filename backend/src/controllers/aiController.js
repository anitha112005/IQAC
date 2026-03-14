// aiController.js — Optimized: Promise.all, .lean(), safe getLatestMetric
import {
  generateStudentProgressAnalysis,
  generateDepartmentPerformanceAnalysis,
  generateCGPADistributionAnalysis,
  generateBacklogAnalysis,
  generatePlacementForecast,
  generateFacultyContributionSummary,
  generateAccreditationReadinessAssessment,
  answerNaturalLanguageQuery
} from "../services/llmService.js";

import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Achievement from "../models/Achievement.js";
import AccreditationItem from "../models/AccreditationItem.js";
import ReportLog from "../models/ReportLog.js";
import User from "../models/User.js";
import { buildPdfBuffer } from "../services/reportService.js";

// ─── SAFE HELPER ─────────────────────────────────────────────────
const getLatestMetric = (student) => {
  if (!student.metrics || student.metrics.length === 0) return null;
  return student.metrics[student.metrics.length - 1];
};

const deptIdOf = (student) => String(student.department?._id || student.department || "");

// ─── CONTROLLER 1: Student Progress Report (PDF) ─────────────────
export const studentProgressReport = async (req, res) => {
  const students = await Student.find().populate("department", "name code").lean();
  const total = students.length;

  let highRisk = 0, medRisk = 0, lowRisk = 0;
  let cgpaSum = 0, cgpaCount = 0, shortage = 0, totalBacklogs = 0;

  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;

    const m = getLatestMetric(s);
    if (m) {
      cgpaSum += m.cgpa;
      cgpaCount++;
      if (m.attendancePercent < 75) shortage++;
      totalBacklogs += m.backlogCount || 0;
    }
  });

  const averageCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;

  // Semester-wise aggregation
  const semMap = {};
  students.forEach(s => {
    (s.metrics || []).forEach(m => {
      if (!semMap[m.semester]) semMap[m.semester] = { cgpaArr: [], attArr: [], passArr: [] };
      semMap[m.semester].cgpaArr.push(m.cgpa);
      semMap[m.semester].attArr.push(m.attendancePercent || 75);
      semMap[m.semester].passArr.push(m.backlogCount === 0 ? 1 : 0);
    });
  });

  const semesterWise = Object.entries(semMap).map(([sem, d]) => ({
    semester: +sem,
    averageCgpa: +(d.cgpaArr.reduce((a, b) => a + b, 0) / d.cgpaArr.length).toFixed(2),
    averageAttendance: +(d.attArr.reduce((a, b) => a + b, 0) / d.attArr.length).toFixed(1),
    passPercent: +(d.passArr.reduce((a, b) => a + b, 0) / d.passArr.length * 100).toFixed(1)
  })).sort((a, b) => a.semester - b.semester);

  const worstSemester = semesterWise.length > 0
    ? semesterWise.reduce((w, s) => s.passPercent < w.passPercent ? s : w, semesterWise[0])
    : { semester: 1, passPercent: 0 };

  const data = {
    totalStudents: total, highRisk: highRisk, mediumRisk: medRisk, lowRisk: lowRisk,
    averageCgpa, attendanceShortage: shortage, totalBacklogs,
    semesterWise, worstSemester, topDepartment: "CSE", bottomDepartment: "MECH"
  };

  const analysis = await generateStudentProgressAnalysis(data);

  const rows = [
    { Metric: "Total Students", Value: total },
    { Metric: "High Risk", Value: highRisk },
    { Metric: "Medium Risk", Value: medRisk },
    { Metric: "Low Risk", Value: lowRisk },
    { Metric: "Avg CGPA", Value: averageCgpa },
    { Metric: "Attendance Shortage", Value: shortage },
    { Metric: "Total Backlogs", Value: totalBacklogs },
    { Metric: "Worst Semester", Value: `Semester ${worstSemester.semester} (${worstSemester.passPercent}% pass)` },
    { Metric: "AI Analysis", Value: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer(`IQAC Student Progress Report — ${new Date().toLocaleDateString()}`, rows);
  await ReportLog.create({ reportType: "STUDENT_PROGRESS", generatedBy: req.user._id, format: "PDF" });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=student_progress_${Date.now()}.pdf`
  });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 2: Department Performance Report (PDF) ───────────
export const departmentPerformanceReport = async (req, res) => {
  const [departments, allStudents, allPlacements, allResearch] = await Promise.all([
    Department.find().lean(),
    Student.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    Research.find().lean()
  ]);

  const deptData = departments.map(dept => {
    const sid = String(dept._id);
    const ds = allStudents.filter(s => String(s.department) === sid);
    const metrics = ds.map(s => getLatestMetric(s)).filter(Boolean);
    const dPlacements = allPlacements.filter(p => String(p.department?._id || p.department) === sid);
    const dResearch = allResearch.filter(r => String(r.department) === sid);

    const avgCgpa = metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0;
    const passPercent = metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0;
    const backlogRate = metrics.length ? +(metrics.filter(m => m.backlogCount > 0).length / metrics.length * 100).toFixed(1) : 0;

    let totalElig = 0, totalPlaced = 0;
    dPlacements.forEach(p => { totalElig += p.totalEligible; totalPlaced += p.totalPlaced; });
    const placementRate = totalElig > 0 ? +(totalPlaced / totalElig * 100).toFixed(1) : 0;

    const score = +(avgCgpa * 10 * 0.35 + passPercent * 0.35 + placementRate * 0.3).toFixed(2);

    return {
      name: dept.name, code: dept.code,
      averageCgpa: avgCgpa, passPercent: parseFloat(passPercent), backlogRate: parseFloat(backlogRate),
      placementRate: parseFloat(placementRate), researchCount: dResearch.length, achievementCount: 0, score
    };
  }).filter(d => d.averageCgpa > 0);

  const analysis = await generateDepartmentPerformanceAnalysis(deptData);

  const rows = deptData.sort((a, b) => b.score - a.score).map((d, i) => ({
    Rank: i + 1, Department: `${d.name} (${d.code})`,
    CGPA: d.averageCgpa, PassPct: `${d.passPercent}%`,
    Placement: `${d.placementRate}%`, Research: d.researchCount, Score: d.score
  }));
  rows.push({ Rank: "AI Analysis", Department: analysis });

  const pdfBuffer = await buildPdfBuffer("Department Performance Comparative Report", rows);
  await ReportLog.create({ reportType: "DEPARTMENT_PERFORMANCE", generatedBy: req.user._id, format: "PDF" });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=department_performance_${Date.now()}.pdf`
  });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 3: CGPA Distribution (JSON) ──────────────────────
export const cgpaDistributionAnalysis = async (req, res) => {
  const students = await Student.find().lean();
  const cgpas = students.map(s => getLatestMetric(s)?.cgpa).filter(c => c != null && c > 0);
  const total = students.length;

  const sorted = [...cgpas].sort((a, b) => a - b);
  const medianCgpa = sorted.length > 0
    ? +(sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]).toFixed(2)
    : 0;

  const distribution = {
    below_6: cgpas.filter(c => c < 6).length,
    six_to_seven: cgpas.filter(c => c >= 6 && c < 7).length,
    seven_to_eight: cgpas.filter(c => c >= 7 && c < 8).length,
    eight_to_nine: cgpas.filter(c => c >= 8 && c < 9).length,
    above_nine: cgpas.filter(c => c >= 9).length,
    averageCgpa: cgpas.length > 0 ? +(cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) : 0,
    medianCgpa,
    belowNBAThreshold: cgpas.filter(c => c < 6.5).length,
    totalStudents: total
  };

  const analysis = await generateCGPADistributionAnalysis(distribution);

  res.json({
    success: true,
    data: { distribution, analysis, averageCgpa: distribution.averageCgpa, medianCgpa, belowNBAThreshold: distribution.belowNBAThreshold }
  });
};

// ─── CONTROLLER 4: Backlog Analysis Report (PDF) ─────────────────
export const backlogAnalysisReport = async (req, res) => {
  const [students, departments] = await Promise.all([
    Student.find().populate("department", "name code").lean(),
    Department.find().lean()
  ]);

  const total = students.length;
  let noBacklog = 0, oneBacklog = 0, twoBacklog = 0, threePlus = 0;
  const deptMap = {};
  const semMap = {};
  const offenders = [];

  students.forEach(s => {
    const m = getLatestMetric(s);
    const bc = m?.backlogCount || 0;
    if (bc === 0) noBacklog++;
    else if (bc === 1) oneBacklog++;
    else if (bc === 2) twoBacklog++;
    else threePlus++;

    const dName = s.department?.name || "Unknown";
    if (!deptMap[dName]) deptMap[dName] = { totalBacklogs: 0, studentsAffected: 0 };
    if (bc > 0) { deptMap[dName].totalBacklogs += bc; deptMap[dName].studentsAffected++; }

    (s.metrics || []).forEach(metric => {
      if ((metric.backlogCount || 0) > 0) {
        if (!semMap[metric.semester]) semMap[metric.semester] = 0;
        semMap[metric.semester]++;
      }
    });

    if (bc > 0) offenders.push({ rollNo: s.rollNo, name: s.name, department: dName, cgpa: m?.cgpa || 0, backlogCount: bc });
  });

  const backlogData = {
    summary: { studentsWithNoBacklogs: noBacklog, studentsWithOneBacklog: oneBacklog, studentsWithTwoBacklogs: twoBacklog, studentsWithThreePlus: threePlus },
    byDepartment: Object.entries(deptMap).map(([dept, d]) => ({ department: dept, ...d })),
    bySemester: Object.entries(semMap).map(([s, c]) => ({ semester: +s, studentsWithBacklogs: c })),
    topOffenders: offenders.sort((a, b) => b.backlogCount - a.backlogCount).slice(0, 10),
    totalStudents: total
  };

  const analysis = await generateBacklogAnalysis(backlogData);

  const rows = [
    { Metric: "No Backlogs", Value: noBacklog },
    { Metric: "1 Backlog", Value: oneBacklog },
    { Metric: "2 Backlogs", Value: twoBacklog },
    { Metric: "3+ Backlogs", Value: threePlus },
    { Metric: "AI Analysis", Value: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Backlog Analysis Report", rows);
  await ReportLog.create({ reportType: "BACKLOG_ANALYSIS", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=backlog_analysis_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 5: Placement Forecast Report (PDF) ───────────────
export const placementForecastReport = async (req, res) => {
  const placements = await Placement.find().populate("department", "name code").lean();

  let totalElig = 0, totalPlaced = 0, topPkg = 0, medSum = 0;
  const recruiterFreq = {};

  const byDepartment = placements.map(p => {
    totalElig += p.totalEligible;
    totalPlaced += p.totalPlaced;
    if (p.highestPackageLPA > topPkg) topPkg = p.highestPackageLPA;
    if (p.medianPackageLPA > 0) medSum += p.medianPackageLPA;
    (p.majorRecruiters || []).forEach(r => { recruiterFreq[r] = (recruiterFreq[r] || 0) + 1; });
    return {
      department: p.department?.name || "Unknown",
      academicYear: p.academicYear,
      totalEligible: p.totalEligible,
      totalPlaced: p.totalPlaced,
      placementRate: p.totalEligible > 0 ? +(p.totalPlaced / p.totalEligible * 100).toFixed(1) : 0,
      highestPackageLPA: p.highestPackageLPA || 0,
      medianPackageLPA: p.medianPackageLPA || 0
    };
  });

  const topRecruiters = Object.entries(recruiterFreq).sort((a, b) => b[1] - a[1]).map(([r]) => r);

  const placementData = {
    institutionSummary: {
      totalEligible: totalElig,
      totalPlaced: totalPlaced,
      overallPlacementRate: totalElig > 0 ? +(totalPlaced / totalElig * 100).toFixed(1) : 0,
      topPackage: topPkg,
      averageMedianPackage: placements.length > 0 ? +(medSum / placements.length).toFixed(2) : 0
    },
    byDepartment,
    topRecruiters
  };

  const analysis = await generatePlacementForecast(placementData);

  const rows = [
    { Metric: "Total Eligible", Value: totalElig },
    { Metric: "Total Placed", Value: totalPlaced },
    { Metric: "Placement Rate", Value: `${placementData.institutionSummary.overallPlacementRate}%` },
    { Metric: "Top Package", Value: `${topPkg} LPA` },
    { Metric: "AI Forecast", Value: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Placement Report and Forecast", rows);
  await ReportLog.create({ reportType: "PLACEMENT", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=placement_forecast_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 6: Faculty Contribution Report (PDF) ─────────────
export const facultyContributionReport = async (req, res) => {
  const { departmentId } = req.body;
  let researchQuery = {};
  if (departmentId) researchQuery.department = departmentId;

  const [publications, totalFaculty, deptDoc] = await Promise.all([
    Research.find(researchQuery).populate("faculty", "name").populate("department", "name").lean(),
    User.countDocuments({ role: "faculty" }),
    departmentId ? Department.findById(departmentId).lean() : Promise.resolve(null)
  ]);

  const byType = {};
  const byFacultyMap = {};
  publications.forEach(p => {
    byType[p.publicationType] = (byType[p.publicationType] || 0) + 1;
    const fname = p.faculty?.name || "Unknown";
    byFacultyMap[fname] = (byFacultyMap[fname] || 0) + 1;
  });

  const facultyData = {
    department: deptDoc?.name || "All Departments",
    totalFaculty,
    publications: publications.slice(0, 5).map(p => ({
      faculty: p.faculty?.name || "Unknown",
      title: p.title,
      publicationType: p.publicationType,
      journalOrConference: p.journalOrConference || ""
    })),
    byType,
    byFaculty: Object.entries(byFacultyMap).map(([faculty, count]) => ({ faculty, count })),
    totalPublications: publications.length
  };

  const analysis = await generateFacultyContributionSummary(facultyData);

  const rows = [
    { Metric: "Department", Value: facultyData.department },
    { Metric: "Total Faculty", Value: totalFaculty },
    { Metric: "Total Publications", Value: publications.length },
    { Metric: "Journals", Value: byType.Journal || 0 },
    { Metric: "Conferences", Value: byType.Conference || 0 },
    { Metric: "Patents", Value: byType.Patent || 0 },
    { Metric: "AI Assessment", Value: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer(`Faculty Contribution Report — ${facultyData.department}`, rows);
  await ReportLog.create({ reportType: "FACULTY_CONTRIBUTION", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=faculty_contribution_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 7: Accreditation Readiness (JSON) ────────────────
export const accreditationReadinessAssessment = async (req, res) => {
  const [nbaRaw, naacRaw] = await Promise.all([
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  const buildData = (items) => ({
    totalItems: items.length,
    completedItems: items.filter(i => i.completed).length,
    readinessScore: items.length > 0 ? +(items.filter(i => i.completed).length / items.length * 100).toFixed(1) : 0,
    missingItems: items.filter(i => !i.completed).slice(0, 5).map(i => ({ title: i.title, criterion: i.criterion }))
  });

  const readinessData = {
    nba: { type: "NBA", ...buildData(nbaRaw) },
    naac: { type: "NAAC", ...buildData(naacRaw) }
  };

  const assessment = await generateAccreditationReadinessAssessment(readinessData);

  const avg = (readinessData.nba.readinessScore + readinessData.naac.readinessScore) / 2;
  const overallVerdict = avg > 80 ? "READY" : avg > 60 ? "REQUIRES ATTENTION" : "CRITICAL";

  res.json({
    success: true,
    data: { nba: readinessData.nba, naac: readinessData.naac, assessment, overallVerdict }
  });
};

// ─── CONTROLLER 8: Natural Language Search (JSON) ─────────────────
export const naturalLanguageSearch = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: "Question is required" });
  }

  // Parallel queries
  const [students, departments, placements, nbaItems, naacItems] = await Promise.all([
    Student.find().lean(),
    Department.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  const total = students.length;
  let highRisk = 0, medRisk = 0, lowRisk = 0, cgpaSum = 0, cgpaCount = 0, shortage = 0;

  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;
    const m = getLatestMetric(s);
    if (m) { cgpaSum += m.cgpa; cgpaCount++; if (m.attendancePercent < 75) shortage++; }
  });

  const avgCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;

  const deptSummaries = departments.map(dept => {
    const sid = String(dept._id);
    const ds = students.filter(s => String(s.department) === sid);
    const metrics = ds.map(getLatestMetric).filter(Boolean);
    const dPlacements = placements.filter(p => String(p.department?._id || p.department) === sid);
    let elig = 0, placed = 0;
    dPlacements.forEach(p => { elig += p.totalEligible; placed += p.totalPlaced; });
    return {
      name: dept.name, code: dept.code,
      averageCgpa: metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0,
      passPercent: metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0,
      placementRate: elig > 0 ? +(placed / elig * 100).toFixed(1) : 0
    };
  });

  const nbaCompleted = nbaItems.filter(i => i.completed).length;
  const naacCompleted = naacItems.filter(i => i.completed).length;

  const databaseSummary = {
    totalStudents: total, highRiskCount: highRisk, mediumRiskCount: medRisk, lowRiskCount: lowRisk,
    averageCgpa: avgCgpa, attendanceShortageCount: shortage,
    departments: deptSummaries,
    placements: placements.map(p => ({
      department: p.department?.name || "Unknown",
      placementRate: p.totalEligible > 0 ? +(p.totalPlaced / p.totalEligible * 100).toFixed(1) : 0
    })),
    accreditation: {
      nbaReadiness: nbaItems.length > 0 ? +(nbaCompleted / nbaItems.length * 100).toFixed(1) : 0,
      naacReadiness: naacItems.length > 0 ? +(naacCompleted / naacItems.length * 100).toFixed(1) : 0,
      pendingNBA: nbaItems.length - nbaCompleted,
      pendingNAAC: naacItems.length - naacCompleted
    }
  };

  const answer = await answerNaturalLanguageQuery(question, databaseSummary);

  res.json({
    success: true,
    data: { answer, question, timestamp: new Date().toISOString() }
  });
};

// ─── CONTROLLER 9: Streaming Search (SSE) ─────────────────────────
// Uses Ollama stream:true to send tokens as they arrive via SSE
export const streamingSearch = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: "Question is required" });
  }

  // Parallel DB fetch
  const [students, departments, placements, nbaItems, naacItems] = await Promise.all([
    Student.find().lean(),
    Department.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  let highRisk = 0, medRisk = 0, lowRisk = 0, cgpaSum = 0, cgpaCount = 0, shortage = 0;
  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;
    const m = getLatestMetric(s);
    if (m) { cgpaSum += m.cgpa; cgpaCount++; if (m.attendancePercent < 75) shortage++; }
  });
  const avgCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;
  const nbaCompleted = nbaItems.filter(i => i.completed).length;
  const naacCompleted = naacItems.filter(i => i.completed).length;

  const deptSummaries = departments.map(dept => {
    const sid = String(dept._id);
    const ds = students.filter(s => String(s.department) === sid);
    const metrics = ds.map(getLatestMetric).filter(Boolean);
    const dPlacements = placements.filter(p => String(p.department?._id || p.department) === sid);
    let elig = 0, placed = 0;
    dPlacements.forEach(p => { elig += p.totalEligible; placed += p.totalPlaced; });
    return {
      code: dept.code, name: dept.name,
      averageCgpa: metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0,
      passPercent: metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0,
      placementRate: elig > 0 ? +(placed / elig * 100).toFixed(1) : 0
    };
  });

  const deptStr = deptSummaries.map(d => `${d.code}:CGPA${d.averageCgpa},Pass${d.passPercent}%,Place${d.placementRate}%`).join(' | ');

  const prompt = `IQAC database facts:
Students: ${students.length} total (High risk: ${highRisk}, Medium: ${medRisk}, Low: ${lowRisk})
Avg CGPA: ${avgCgpa}, Attendance shortage: ${shortage} students below 75%
Departments: ${deptStr}
NBA readiness: ${nbaItems.length > 0 ? +(nbaCompleted/nbaItems.length*100).toFixed(1) : 0}%, NAAC: ${naacItems.length > 0 ? +(naacCompleted/naacItems.length*100).toFixed(1) : 0}%

Question: "${question}"

Answer in maximum 2 sentences using ONLY the facts above.
First sentence: direct answer with specific number from the data.
Second sentence: brief context or implication.
If insufficient data: reply "Insufficient data available for this query."`;

  // Set SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.flushHeaders();

  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt,
        stream: true,
        options: { num_predict: 100, temperature: 0.3, top_p: 0.9 }
      })
    });

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            res.write(`data: ${JSON.stringify({ token: json.response })}\n\n`);
          }
          if (json.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } catch {}
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI unavailable" })}\n\n`);
  }

  res.end();
};

