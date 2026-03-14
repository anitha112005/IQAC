import {
  generateAccreditationAnalysis,
  generateStudentIntervention,
  generateDepartmentRanking,
  answerNaturalLanguageQuery,
  generatePlacementForecast,
  generatePDFCode
} from "./src/services/llmService.js";

// Mock data based on seedFullData.js
const mockMetrics = {
  averageCgpa: 8.2,
  avgPassPercent: 85,
  placementRate: 90,
  researchPublications: 10,
  highRisk: 2,
  totalStudents: 120
};

const mockStudent = {
  name: "Ravi Kumar Sharma",
  department: { name: "Computer Science and Engineering" },
  currentSemester: 6,
  riskLevel: "HIGH",
  metrics: [{
    cgpa: 6.1,
    attendancePercent: 55,
    backlogCount: 4
  }]
};

const mockDepartments = [
  { department: "CSE", averageCgpa: 8.5, passPercent: 90, placementRate: 95 },
  { department: "ECE", averageCgpa: 8.0, passPercent: 85, placementRate: 88 },
  { department: "MECH", averageCgpa: 7.5, passPercent: 80, placementRate: 75 }
];

const mockDataSummary = {
  totalStudents: 500,
  highRisk: 10,
  avgCgpa: 7.8,
  departments: ["CSE", "ECE", "MECH", "CIVIL", "IT"]
};

const mockHistorical = {
  "2022-23": 80,
  "2023-24": 95
};

const mockContextForPdf = {
  departmentName: "Computer Science and Engineering",
  academicYear: "2023-24",
  metrics: mockMetrics,
  readinessScore: 85,
  criteriaMet: 5,
  totalCriteria: 6,
  atRiskStudents: [
    { name: "Ravi Kumar Sharma", cgpa: 6.1, attendance: 55, backlogs: 4 }
  ],
  placementSummary: { highest: 42, median: 8.5, recruiters: "TCS, Infosys" },
  researchList: ["Paper 1", "Paper 2"],
  preGeneratedAnalysis: "This is a test analysis."
};

async function runTests() {
  console.log("Starting LLM function tests...");

  // Note: These will return the "fallback" string ("AI analysis unavailable...") 
  // because OPENROUTER_API_KEY is still invalid in .env, BUT they will successfully
  // execute the logic inside llmService.js to verify there are no syntax/reference errors.

  try {
     console.log("\n--- Testing Job 1: Accreditation Analysis ---");
     const r1 = await generateAccreditationAnalysis(mockMetrics);
     console.log(r1);

     console.log("\n--- Testing Job 2: Student Intervention ---");
     const r2 = await generateStudentIntervention(mockStudent);
     console.log(r2);

     console.log("\n--- Testing Job 3: Department Ranking ---");
     const r3 = await generateDepartmentRanking(mockDepartments);
     console.log(r3);

     console.log("\n--- Testing Job 4: Natural Language Search ---");
     const r4 = await answerNaturalLanguageQuery("How many high risk students?", mockDataSummary);
     console.log(r4);

     console.log("\n--- Testing Job 5: Placement Forecast ---");
     const r5 = await generatePlacementForecast(mockHistorical);
     console.log(r5);

     console.log("\n--- Testing Job 6: PDF Code Generation ---");
     const r6 = await generatePDFCode(mockContextForPdf);
     console.log(r6);

     console.log("\n✅ All functions executed without crashing.");
  } catch (err) {
      console.error("❌ Test failed:", err);
  }
}

runTests();
