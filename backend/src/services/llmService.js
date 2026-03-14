// backend/src/services/llmService.js

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4o-mini";

const callLLM = async (prompt, maxTokens = 250) => {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "AI analysis unavailable.";
  } catch (err) {
    console.error("LLM call failed:", err.message);
    return "AI analysis unavailable. Core data is accurate.";
  }
};

// ── 1. Accreditation Report Analysis ─────────────────────────
export const generateAccreditationAnalysis = async (metrics) => {
  const prompt = `
You are an IQAC coordinator writing a formal NBA accreditation report.

Department Data:
- Average CGPA: ${metrics.averageCgpa}
- Pass Percentage: ${metrics.avgPassPercent}%
- Placement Rate: ${metrics.placementRate}%
- Research Publications: ${metrics.researchPublications}
- High Risk Students: ${metrics.highRisk}
- Total Students: ${metrics.totalStudents}

Write a formal 100-word NBA accreditation assessment covering:
1. Overall academic health (2 sentences)
2. Accreditation readiness — MEETS or FAILS key criteria (1 sentence)
3. Single most critical improvement needed (1 sentence)

Use formal academic language. No bullet points.
`;
  return await callLLM(prompt, 300);
};

// ── 2. Student Intervention Advice ───────────────────────────
export const generateStudentIntervention = async (student) => {
  const latest = student.metrics?.at(-1) || {};
  const prompt = `
Student academic profile:
- Name: ${student.name}
- Department: ${student.department?.name || "N/A"}
- Current Semester: ${student.currentSemester}
- CGPA: ${latest.cgpa}
- Attendance: ${latest.attendancePercent}%
- Backlogs: ${latest.backlogCount}
- Risk Level: ${student.riskLevel}

Write a 3-sentence personalized intervention plan 
for this student's faculty advisor.
Be specific, actionable, and use formal academic language.
`;
  return await callLLM(prompt, 150);
};

// ── 3. Department Ranking with Reasoning ─────────────────────
export const generateDepartmentRanking = async (departments) => {
  const deptSummary = departments.map(d =>
    `${d.department}: CGPA=${d.averageCgpa}, Pass%=${d.passPercent}, Placements=${d.placementRate}%`
  ).join("\n");

  const prompt = `
Rank these university departments by NBA accreditation readiness:

${deptSummary}

Respond in exactly this format:
Rank 1: [Department] — [one specific reason]
Rank 2: [Department] — [one specific reason]
Rank 3: [Department] — [one specific reason]
Critical weakness of bottom department: [one sentence]

Maximum 80 words total.
`;
  return await callLLM(prompt, 200);
};

// ── 4. Natural Language Search ────────────────────────────────
export const answerNaturalLanguageQuery = async (question, dataSummary) => {
  const prompt = `
You are an IQAC data assistant.
Academic data available: ${JSON.stringify(dataSummary)}
Question: "${question}"

Answer using only the data above.
Maximum 2 sentences. Include specific numbers.
If insufficient data, say "Insufficient data to answer."
`;
  return await callLLM(prompt, 100);
};

// ── 5. Placement Forecast ─────────────────────────────────────
export const generatePlacementForecast = async (historical) => {
  const historyStr = Object.entries(historical)
    .map(([year, count]) => `${year}: ${count} students placed`)
    .join("\n");

  const prompt = `
University placement history:
${historyStr}

Based on this trend:
1. Predict next year placement count (just the number)
2. Explain trend in 20 words
3. One recommendation to improve

Keep total under 60 words.
`;
  return await callLLM(prompt, 120);
};

// ── 6. Generate PDF Python Code ───────────────────────────────
export const generatePDFCode = async (contextData) => {
  const prompt = `
You are a Python developer. Generate a complete Python script using the 'fpdf2' library to create a professional IQAC academic report PDF.

Use this data:
${JSON.stringify(contextData, null, 2)}

The PDF must include:
1. Title: IQAC Department Performance Report
2. Academic year and department name
3. Key metrics table: Average CGPA, Pass Percentage, Placement Rate, High Risk Students, Research Publications
4. NBA Accreditation Readiness score
5. At-risk students list with name, CGPA, attendance, backlogs
6. Placement summary with recruiter names
7. Research publications list
8. A formal AI-generated analysis paragraph at the bottom

Rules:
- Use only fpdf2 library
- Save the PDF to src/utils/output/iqac_report.pdf
- No user input required, all data is hardcoded from the context above
- Output ONLY the Python code, no explanation, no markdown, no backticks
`;
  return await callLLM(prompt, 1500); // Allow more tokens for python code
};
