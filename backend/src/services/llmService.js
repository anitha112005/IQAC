// backend/src/services/llmService.js

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";

export const callMistral = async (prompt) => {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt: prompt,
        stream: false
      })
    });
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error("Mistral API error:", err);
    return "AI unavailable";
  }
};

export const generatePDFCode = async (data) => {
  const prompt = `You are a Python developer. Write a complete Python script using fpdf2 library to generate a professional IQAC NBA accreditation report PDF.

Department Data:
- Department: ${data.department}
- Academic Year: ${data.academicYear}
- Average CGPA: ${data.averageCgpa}
- Pass Percentage: ${data.passPercent}%
- Placement Rate: ${data.placementRate}%
- High Risk Students: ${data.highRisk}
- Total Students: ${data.totalStudents}
- Research Publications: ${data.researchPublications}
- NBA Readiness Score: ${data.readinessScore}%
- At Risk Students: ${JSON.stringify(data.atRiskStudents)}
- Top Recruiters: ${data.recruiters}

The PDF must have:
1. Centered title: IQAC Department Performance Report
2. Department and academic year header
3. Metrics table with all values above
4. At-risk students table with name, CGPA, attendance, backlogs
5. Formal NBA assessment paragraph
6. Save to: output/iqac_report.pdf

Output ONLY raw Python code. 
No markdown. No backticks. No explanation.`;
  return await callMistral(prompt);
};

export const generateStudentIntervention = async (student) => {
  const prompt = `You are an academic advisor writing a formal intervention plan.

Student Profile:
- Name: ${student.name}
- Department: ${student.department}
- Semester: ${student.currentSemester}
- Current CGPA: ${student.cgpa}
- Attendance: ${student.attendance}%
- Backlogs: ${student.backlogs}
- Risk Level: ${student.riskLevel}
- CGPA Trend: ${student.cgpaTrend}

Write exactly 3 sentences:
Sentence 1: Describe the academic situation using numbers.
Sentence 2: Give one specific immediate action for faculty.
Sentence 3: Give one long-term recommendation.

Use formal academic language. No bullet points.`;
  return await callMistral(prompt);
};

export const generateDepartmentRanking = async (departments) => {
  const deptStr = departments.map(d => 
    `${d.name}: Avg CGPA ${d.averageCgpa}, Pass% ${d.passPercent}, Placement% ${d.placementRate}, Research ${d.researchPublications}, High Risk ${d.highRiskCount}`
  ).join("\n");

  const prompt = `Rank these university departments by NBA accreditation readiness. Use the data below:

${deptStr}

Respond in EXACTLY this format, nothing else:
Rank 1: [name] — [one specific reason with a number]
Rank 2: [name] — [one specific reason with a number]  
Rank 3: [name] — [one specific reason with a number]
Rank 4: [name] — [one specific reason with a number]
Rank 5: [name] — [one specific reason with a number]
Critical weakness: [bottom department one sentence fix]`;
  return await callMistral(prompt);
};

export const answerNaturalLanguageQuery = async (question, dataSummary) => {
  const prompt = `You are an IQAC data assistant with access to this academic database summary:
${JSON.stringify(dataSummary, null, 2)}

Answer this question using ONLY the data above:
${question}

Rules:
- Maximum 2 sentences
- Include specific numbers from the data
- If data is insufficient say: Insufficient data to answer
- No introduction, answer directly`;
  return await callMistral(prompt);
};

export const generatePlacementForecast = async (departmentName, historical) => {
  const histStr = Object.entries(historical).map(([year, count]) => `${year}: ${count}`).join("\n");
  const prompt = `Analyze placement trends for ${departmentName} department:
${histStr}

Provide:
1. Predicted placement count for 2024-25 (just the number)
2. Trend explanation in exactly 20 words
3. One specific recommendation to improve placements

Format exactly as:
Prediction: [number]
Trend: [20 words]
Recommendation: [one sentence]`;
  return await callMistral(prompt);
};
