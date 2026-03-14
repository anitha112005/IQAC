// backend/src/controllers/aiController.js

import {
  generatePDFCode,
  generateStudentIntervention,
  generateDepartmentRanking,
  answerNaturalLanguageQuery,
  generatePlacementForecast
} from "../services/llmService.js";

import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generatePDF = async (req, res) => {
  try {
    // 1. Query MongoDB for institutional overview data (mocked from request body mostly per user flow)
    const { departmentName, academicYear } = req.body;
    
    // 2. Query at-risk students where riskLevel is HIGH
    const atRiskList = await Student.find({ riskLevel: "HIGH" }).select("name metrics");
    const atRiskFormatted = atRiskList.map(s => {
      const latest = s.metrics?.at(-1) || {};
      return { name: s.name, cgpa: latest.cgpa, attendance: latest.attendancePercent, backlogs: latest.backlogCount };
    });

    // 3. Query placements for latest academic year
    const placementData = await Placement.findOne({ 
      academicYear: "2023-24" // using latest
    }).populate("department");

    // 4. Build data object with all fields needed by generatePDFCode()
    const data = {
      department: departmentName || "Institutional",
      academicYear: academicYear || "2024-25",
      averageCgpa: 7.8,
      passPercent: 82,
      placementRate: placementData ? ((placementData.totalPlaced / placementData.totalEligible) * 100).toFixed(1) : 0,
      highRisk: atRiskFormatted.length,
      totalStudents: 1200,
      researchPublications: 15,
      readinessScore: 85,
      atRiskStudents: atRiskFormatted,
      recruiters: placementData ? placementData.majorRecruiters.join(", ") : "N/A"
    };

    // 5. Call generatePDFCode(data) to get Python code string
    const pythonCode = await generatePDFCode(data);

    // 6. Create directory: backend/src/utils/output/ if not exists
    const utilsPath = path.join(__dirname, '..', 'utils');
    const outputPath = path.join(utilsPath, 'output');
    
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // 7. Write the Python code to: backend/src/utils/pdf_generator.py
    const scriptPath = path.join(utilsPath, "pdf_generator.py");
    fs.writeFileSync(scriptPath, pythonCode, "utf8");

    // 8. Execute: python pdf_generator.py using execSync with cwd set to backend/src/utils/
    execSync("python pdf_generator.py", { cwd: utilsPath });

    // 9. If pdf file exists at backend/src/utils/output/iqac_report.pdf send it
    const pdfFilePath = path.join(outputPath, "iqac_report.pdf");
    if (fs.existsSync(pdfFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.download(pdfFilePath, "iqac_report.pdf");
    } else {
      throw new Error("PDF file was not created by the script");
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

export const studentIntervention = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("department");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const latest = student.metrics?.at(-1) || {};
    const cgpaTrendStr = student.metrics ? 
      student.metrics.map(m => `Sem ${m.semester}: ${m.cgpa}`).join(", ") : "No prior records";

    const profile = {
      name: student.name,
      department: student.department?.name || "N/A",
      currentSemester: student.currentSemester,
      cgpa: latest.cgpa,
      attendance: latest.attendancePercent,
      backlogs: latest.backlogCount,
      riskLevel: student.riskLevel,
      cgpaTrend: cgpaTrendStr
    };

    const advice = await generateStudentIntervention(profile);
    return res.json({ success: true, data: { advice, studentName: student.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const departmentRanking = async (req, res) => {
  try {
    const depts = await Department.find();
    const students = await Student.find();
    const placements = await Placement.find({ academicYear: "2023-24" }); // Latest year
    
    const formattedDepartments = depts.map(dept => {
      const deptStudents = students.filter(s => s.department?.toString() === dept._id.toString());
      const deptPlacement = placements.find(p => p.department?.toString() === dept._id.toString());
      
      const avgCgpa = deptStudents.length ? 
        (deptStudents.reduce((sum, s) => sum + (s.metrics?.at(-1)?.cgpa || 0), 0) / deptStudents.length).toFixed(2) : 0;
      
      const highRiskCount = deptStudents.filter(s => s.riskLevel === "HIGH").length;
      const placementRate = deptPlacement ? 
        ((deptPlacement.totalPlaced / deptPlacement.totalEligible) * 100).toFixed(1) : 0;

      return {
        name: dept.name,
        averageCgpa: avgCgpa,
        passPercent: 85, // Mocked or calculated differently
        placementRate: placementRate,
        researchPublications: 5, // Mocked or aggregated
        highRiskCount
      };
    });

    const ranking = await generateDepartmentRanking(formattedDepartments);
    res.json({ success: true, data: { ranking, departments: formattedDepartments } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const naturalLanguageSearch = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, message: "No question provided" });

    const students = await Student.find();
    const depts = await Department.find();
    
    const dataSummary = {
      totalStudents: students.length,
      highRiskCount: students.filter(s => s.riskLevel === "HIGH").length,
      avgCgpa: (students.reduce((sum, s) => sum + (s.metrics?.at(-1)?.cgpa || 0), 0) / (students.length || 1)).toFixed(2),
      departments: depts.map(d => d.name),
      latestPlacementRates: "CSE 82%, IT 92%, MECH 64%" // Mocking for summary brevity
    };

    const answer = await answerNaturalLanguageQuery(question, dataSummary);
    res.json({ success: true, data: { answer, question } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const placementForecast = async (req, res) => {
  try {
    const { departmentName } = req.body;
    if (!departmentName) return res.status(400).json({ success: false, message: "departmentName required" });

    const dept = await Department.findOne({ name: departmentName });
    if (!dept) return res.status(404).json({ success: false, message: "Department not found" });

    const placements = await Placement.find({ department: dept._id }).sort({ academicYear: 1 });
    
    const historical = {};
    placements.forEach(p => {
      historical[p.academicYear] = p.totalPlaced;
    });

    const forecast = await generatePlacementForecast(departmentName, historical);
    res.json({ success: true, data: { forecast, departmentName } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
