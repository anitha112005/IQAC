// backend/src/controllers/aiController.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import Student from "../models/Student.js";
import {
  generateAccreditationAnalysis,
  generateStudentIntervention,
  generateDepartmentRanking,
  answerNaturalLanguageQuery,
  generatePlacementForecast,
  generatePDFCode
} from "../services/llmService.js";
import { institutionalOverview } from "./analyticsController.js";
import { departmentComparison } from "./analyticsController.js";

// POST /api/ai/accreditation-report
export const accreditationReport = async (req, res) => {
  // Reuse existing analytics data — no duplicate DB calls
  const overviewRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/analytics/overview`, {
    headers: { Authorization: req.headers.authorization }
  });
  const { data: metrics } = await overviewRes.json();
  const analysis = await generateAccreditationAnalysis(metrics);
  return res.json({ success: true, data: { analysis, metrics } });
};

// GET /api/ai/student-intervention/:id
export const studentIntervention = async (req, res) => {
  const student = await Student.findById(req.params.id).populate("department", "name code");
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  const advice = await generateStudentIntervention(student);
  return res.json({ success: true, data: { advice, student: student.name } });
};

// GET /api/ai/department-ranking
export const departmentRanking = async (req, res) => {
  const compRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/analytics/department-comparison`, {
    headers: { Authorization: req.headers.authorization }
  });
  const { data: departments } = await compRes.json();
  const ranking = await generateDepartmentRanking(departments);
  return res.json({ success: true, data: { ranking, departments } });
};

// POST /api/ai/search
export const naturalLanguageSearch = async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ success: false, message: "Question required" });

  // Fetch summary data to give LLM context
  const students = await Student.find().populate("department", "name code");
  const dataSummary = {
    totalStudents: students.length,
    highRisk: students.filter(s => s.riskLevel === "HIGH").length,
    avgCgpa: (students.reduce((sum, s) => sum + (s.metrics.at(-1)?.cgpa || 0), 0) / students.length).toFixed(2),
    departments: [...new Set(students.map(s => s.department?.name))]
  };

  const answer = await answerNaturalLanguageQuery(question, dataSummary);
  return res.json({ success: true, data: { answer, question } });
};

// POST /api/ai/placement-forecast
export const placementForecast = async (req, res) => {
  const { historical } = req.body;
  if (!historical) return res.status(400).json({ success: false, message: "Historical data required" });
  const forecast = await generatePlacementForecast(historical);
  return res.json({ success: true, data: { forecast } });
};

// POST /api/ai/generate-pdf
export const generatePDF = async (req, res) => {
  try {
    const contextData = req.body;
    if (!contextData) return res.status(400).json({ success: false, message: "Context data required" });

    // 1. Generate python code using LLM
    let pythonCode = await generatePDFCode(contextData);
    
    // Clean up code if LLM included markdown blocks despite instructions
    pythonCode = pythonCode.replace(/^```python\n/, "").replace(/```$/, "").trim();

    // 2. Overwrite pdf_generator.py
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const utilsDir = path.join(__dirname, "../utils");
    const outputDir = path.join(utilsDir, "output");
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scriptPath = path.join(utilsDir, "pdf_generator.py");
    const pdfPath = path.join(outputDir, "iqac_report.pdf");

    // Clean up existing PDF if any
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    fs.writeFileSync(scriptPath, pythonCode, "utf8");

    // 3. Execute the python script
    exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error("Python execution error:", error);
        console.error("Stderr:", stderr);
        return res.status(500).json({ success: false, message: "PDF generation script failed", error: stderr });
      }

      // 4. Send the generated PDF
      if (fs.existsSync(pdfPath)) {
        res.sendFile(pdfPath);
      } else {
        res.status(500).json({ success: false, message: "PDF file was not created by the script" });
      }
    });

  } catch (error) {
    console.error("Generate PDF error:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
};
