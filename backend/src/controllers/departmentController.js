import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Achievement from "../models/Achievement.js";
import Student from "../models/Student.js";

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
