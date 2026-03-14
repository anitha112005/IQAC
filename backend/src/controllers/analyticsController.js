import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";

export const institutionalOverview = async (_, res) => {
  const students = await Student.find();
  const departments = await Department.find();
  const placements = await Placement.find();
  const research = await Research.find();

  const latestMetrics = students.map((s) => s.metrics.at(-1)).filter(Boolean);

  const highRisk = students.filter((s) => s.riskLevel === "HIGH").length;
  const mediumRisk = students.filter((s) => s.riskLevel === "MEDIUM").length;
  const lowRisk = students.filter((s) => s.riskLevel === "LOW").length;

  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
    : 0;

  const avgPassPercent = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
    : 0;

  const placementRate = placements.length
    ? placements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / placements.length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      totalStudents: students.length,
      totalDepartments: departments.length,
      averageCgpa: Number(avgCgpa.toFixed(2)),
      averagePassPercent: Number(avgPassPercent.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      researchPublications: research.length,
      riskDistribution: { highRisk, mediumRisk, lowRisk }
    }
  });
};

export const departmentComparison = async (_, res) => {
  const departments = await Department.find();
  const students = await Student.find();
  const placements = await Placement.find();

  const rows = departments.map((d) => {
    const deptStudents = students.filter((s) => String(s.department) === String(d._id));
    const latest = deptStudents.map((s) => s.metrics.at(-1)).filter(Boolean);
    const deptPlacements = placements.filter((p) => String(p.department) === String(d._id));

    const passPercent = latest.length
      ? (latest.filter((m) => m.backlogCount === 0).length / latest.length) * 100
      : 0;

    const averageCgpa = latest.length
      ? latest.reduce((sum, m) => sum + m.cgpa, 0) / latest.length
      : 0;

    const backlogRate = latest.length
      ? (latest.filter((m) => m.backlogCount > 0).length / latest.length) * 100
      : 0;

    const placementRate = deptPlacements.length
      ? deptPlacements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / deptPlacements.length
      : 0;

    return {
      department: d.name,
      code: d.code,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(averageCgpa.toFixed(2)),
      backlogRate: Number(backlogRate.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      score: Number((passPercent * 0.35 + averageCgpa * 10 * 0.35 + placementRate * 0.3).toFixed(2))
    };
  });

  const ranked = rows.sort((a, b) => b.score - a.score).map((row, idx) => ({ rank: idx + 1, ...row }));
  return res.status(200).json({ success: true, data: ranked });
};

export const riskStudents = async (req, res) => {
  const { risk = "HIGH" } = req.query;
  const data = await Student.find({ riskLevel: risk }).populate("department", "name code");
  return res.status(200).json({ success: true, data });
};
