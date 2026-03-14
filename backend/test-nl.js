import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { answerNaturalLanguageQuery } from './src/services/llmService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runNLTests() {
    console.log("=== STARTING JOB 4 LLM TESTS ===");
    
    // 1. Read mock data
    const mockDataPath = path.join(__dirname, 'newfolder', 'mock_data.json');
    if (!fs.existsSync(mockDataPath)) {
        console.error("❌ mock_data.json not found!");
        return;
    }
    
    const students = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
    
    // 2. Build live data summary for LLM
    const totalStudents = students.length;
    const highRiskCount = students.filter(s => s.riskLevel === "HIGH").length;
    const avgCgpa = (students.reduce((sum, s) => sum + s.cgpa, 0) / totalStudents).toFixed(2);
    const avgAttendance = (students.reduce((sum, s) => sum + s.attendancePercent, 0) / totalStudents).toFixed(2);
    const eligibleCount = students.filter(s => s.placementEligible).length;
    
    // Dept Breakdown (useful context)
    const deptStats = {};
    students.forEach(s => {
        if (!deptStats[s.department]) {
            deptStats[s.department] = { count: 0, highRisk: 0, cgpaSum: 0 };
        }
        deptStats[s.department].count++;
        deptStats[s.department].cgpaSum += s.cgpa;
        if (s.riskLevel === "HIGH") deptStats[s.department].highRisk++;
    });
    
    const deptAverages = {};
    for (const [dept, stats] of Object.entries(deptStats)) {
        deptAverages[dept] = {
            avgCgpa: (stats.cgpaSum / stats.count).toFixed(2),
            highRiskStudents: stats.highRisk
        };
    }

    const dataSummary = {
        totalStudents,
        totalHighRisk: highRiskCount,
        institutionalAvgCgpa: avgCgpa,
        institutionalAvgAttendance: `${avgAttendance}%`,
        placementEligibleCount: eligibleCount,
        departmentBreakdown: deptAverages
    };

    console.log("Providing this exact summary to Mistral:\n", JSON.stringify(dataSummary, null, 2));
    console.log("\n------------------------------------------------\n");

    const questions = [
        "How many HIGH risk students are in CSE?",
        "Which department has the lowest average CGPA?",
        "How many students are placement eligible?",
        "What is the average attendance across all departments?"
    ];

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        console.log(`\n🗣️ QUESTION ${i+1}: "${q}"`);
        try {
            const answer = await answerNaturalLanguageQuery(q, dataSummary);
            console.log(`🤖 MISTRAL ANSWER:\n${answer}`);
        } catch (err) {
            console.log(`❌ Error querying Mistral: ${err.message}`);
        }
        await wait(2000); // Prevent rate limiting or hitting Ollama too fast
    }
    
    console.log("\n=== ALL TESTS COMPLETED ===");
}

runNLTests();
