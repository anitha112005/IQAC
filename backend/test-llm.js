import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import mongoose from 'mongoose';
import Student from './src/models/Student.js';
import Department from './src/models/Department.js';
import { 
    generateAccreditationAnalysis, 
    generateStudentIntervention, 
    generateDepartmentRanking, 
    answerNaturalLanguageQuery, 
    generatePlacementForecast, 
    generatePDFCode 
} from './src/services/llmService.js';

dotenv.config();

// Ensure the real API key is injected correctly
// E.g., process.env.OPENROUTER_API_KEY = "your-key-here";

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("=== STARTING MISTRAL LLM VERIFICATION TESTS ===");
    
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your-new-key-here") {
        console.error("❌ ERROR: Please set a valid OPENROUTER_API_KEY in the .env file before testing.");
        process.exit(1);
    }
    
    await connectDB();
    
    // JOB 1: PDF GENERATOR
    console.log("\n[Job 1] Testing Python PDF Code Generation...");
    const mockContext = {
        departmentName: "Computer Science and Engineering",
        academicYear: "2024-25",
        metrics: {
            averageCgpa: 8.5,
            passPercent: 88,
            placementRate: 92,
            highRiskCount: 2,
            researchPublications: 3
        },
        readinessScore: "85%",
        atRiskStudents: [
            { name: "Ravi Kumar Sharma", cgpa: 6.1, backlogs: 4 }
        ],
        placementSummary: { highest: "42 LPA", median: "8.5 LPA", recruiters: "TCS, Amazon, Microsoft" },
        researchList: [
            "Deep Learning Approaches for Early Detection of Diabetic Retinopathy"
        ]
    };
    const pdfCode = await generatePDFCode(mockContext);
    console.log("Python Code Output Snippet (first 100 chars):", pdfCode.substring(0, 100).replace(/\n/g, ' '));
    console.log("Valid Python format (starts with 'from fpdf'):", pdfCode.includes("from fpdf"));
    await wait(2000); // pause to respect rate limits
    
    // JOB 2: STUDENT INTERVENTION
    console.log("\n[Job 2] Testing Student Intervention Advice...");
    const student = await Student.findOne({ rollNo: "21CSE001" }).populate("department");
    if (student) {
        const advice = await generateStudentIntervention(student);
        console.log("Intervention JSON:", advice);
        console.log("Is Valid JSON:", advice.trim().startsWith("{"));
    } else {
        console.log("Skipping Job 2, seed data '21CSE001' not found.");
    }
    await wait(2000);
    
    // JOB 3: DEPARTMENT RANKING
    console.log("\n[Job 3] Testing Department Ranking...");
    const departments = [
        { department: "CSE", averageCgpa: 8.2, passPercent: 90, placementRate: 95, highRiskCount: 2 },
        { department: "ECE", averageCgpa: 7.9, passPercent: 85, placementRate: 88, highRiskCount: 1 },
        { department: "MECH", averageCgpa: 7.1, passPercent: 78, placementRate: 65, highRiskCount: 5 },
        { department: "CIVIL", averageCgpa: 6.8, passPercent: 70, placementRate: 58, highRiskCount: 6 },
        { department: "IT", averageCgpa: 8.4, passPercent: 92, placementRate: 96, highRiskCount: 1 }
    ];
    const ranking = await generateDepartmentRanking(departments);
    console.log("Ranking Output:\n", ranking);
    await wait(2000);
    
    // JOB 4: NATURAL LANGUAGE SEARCH
    console.log("\n[Job 4] Testing Natural Language Search...");
    const dataSummary = {
        totalStudents: 1200,
        highRisk: 15,
        avgCgpa: "7.6",
        departments: ["CSE", "ECE", "MECH", "CIVIL", "IT"]
    };
    const answer = await answerNaturalLanguageQuery("How many high risk students do we have in total?", dataSummary);
    console.log("NL Answer:", answer);
    await wait(2000);
    
    // JOB 5: PLACEMENT FORECAST
    console.log("\n[Job 5] Testing Placement Forecast...");
    const historical = {
        "2022-23": 89,
        "2023-24": 98
    };
    const forecast = await generatePlacementForecast(historical);
    console.log("Forecast JSON:", forecast);
    console.log("Is Valid JSON:", forecast.trim().startsWith("{"));
    
    console.log("\n=== ALL TESTS COMPLETED ===");
    mongoose.connection.close();
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    mongoose.connection.close();
});
