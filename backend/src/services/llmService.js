// llmService.js — Optimized for speed: short prompts + Ollama options + caching

const OLLAMA_URL = "http://localhost:11434/api/generate";

// ─── IN-MEMORY CACHE (5 min TTL) ─────────────────────────────────
const llmCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const getCached = (key) => {
  const hit = llmCache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.v;
  return null;
};

export const setCache = (key, value) => llmCache.set(key, { v: value, t: Date.now() });
export const clearCache = () => llmCache.clear();

// ─── BASE FUNCTION ────────────────────────────────────────────────
// NO AbortController — let Mistral complete naturally on slow hardware
export async function callMistral(prompt, maxTokens = 80) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt,
        stream: false,
        options: {
          num_predict: maxTokens,  // 80 tokens = ~2-3 sentences, very fast
          temperature: 0.3,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      })
    });

    const data = await res.json();

    if (!data.response) {
      console.error("Empty Mistral response:", JSON.stringify(data));
      return "Analysis unavailable.";
    }

    return data.response.trim();
  } catch (err) {
    console.error("Mistral error:", err.message);
    return "AI analysis unavailable. Data is accurate.";
  }
}

// ─── JOB 1: Student Progress ───────────────────────────────────────
export async function generateStudentProgressAnalysis(data) {
  const prompt = `IQAC student progress data:
Students: ${data.totalStudents}, High risk: ${data.highRisk} (${Math.round(data.highRisk/data.totalStudents*100)}%), Avg CGPA: ${data.averageCgpa}
Attendance shortage (<75%): ${data.attendanceShortage}, Total backlogs: ${data.totalBacklogs}
Worst semester: Semester ${data.worstSemester?.semester} (${data.worstSemester?.passPercent}% pass rate)
Semester CGPAs: ${data.semesterWise.map(s=>`Sem${s.semester}:${s.averageCgpa}`).join(', ')}

Write a formal IQAC academic analysis in exactly 4 sentences:
1. CGPA trend across semesters (improving/declining/stagnant)
2. Attendance and backlog severity assessment
3. Risk level interpretation vs acceptable threshold (10% high risk max)
4. One specific, actionable intervention recommendation
Use formal academic language. No bullet points, no headers.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 2: Department Performance ────────────────────────────────
export async function generateDepartmentPerformanceAnalysis(departments) {
  const sorted = [...departments].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const prompt = `Department performance for NBA accreditation review:
Best: ${top?.name} — CGPA ${top?.averageCgpa}, Pass ${top?.passPercent}%, Placement ${top?.placementRate}%, Research ${top?.researchCount}
Worst: ${bottom?.name} — CGPA ${bottom?.averageCgpa}, Pass ${bottom?.passPercent}%, Placement ${bottom?.placementRate}%
All scores: ${sorted.map(d=>`${d.code}:${d.score?.toFixed?.(1)}`).join(', ')}
NBA minimum pass threshold: 60%

Write formal analysis in 4 sentences:
1. Why the top-ranked department leads (cite 2 metrics)
2. Critical weaknesses of the bottom department and consequences
3. Institution-wide NBA pass percentage compliance
4. Specific urgent action for the weakest department
Academic language. No headers.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 3: CGPA Distribution ─────────────────────────────────────
export async function generateCGPADistributionAnalysis(d) {
  const cacheKey = `cgpa_dist_${Math.round(Date.now() / CACHE_TTL)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `CGPA distribution analysis:
Below 6.0: ${d.below_6} | 6-7: ${d.six_to_seven} | 7-8: ${d.seven_to_eight} | 8-9: ${d.eight_to_nine} | Above 9: ${d.above_nine}
Total: ${d.totalStudents}, Average: ${d.averageCgpa}, Median: ${d.medianCgpa}
Below NBA threshold (6.5): ${d.belowNBAThreshold} students (${Math.round(d.belowNBAThreshold/d.totalStudents*100)}%)

Write 3 formal sentences:
1. Distribution pattern (is it skewed low/high, where is the concentration band)
2. NBA compliance: does average CGPA meet 6.5 minimum — state MEETS or FAILS with reason
3. Key warning or positive finding based on the numbers
Formal academic language.`;

  const result = await callMistral(prompt, 150);
  setCache(cacheKey, result);
  return result;
}

// ─── JOB 4: Backlog Analysis ──────────────────────────────────────
export async function generateBacklogAnalysis(backlogData) {
  const worstDept = [...backlogData.byDepartment].sort((a, b) => b.totalBacklogs - a.totalBacklogs)[0];
  const worstSem = [...backlogData.bySemester].sort((a, b) => b.studentsWithBacklogs - a.studentsWithBacklogs)[0];
  const cleanRate = Math.round(backlogData.summary.studentsWithNoBacklogs / backlogData.totalStudents * 100);

  const prompt = `Backlog analysis for academic review:
Clean pass rate: ${cleanRate}% (${backlogData.summary.studentsWithNoBacklogs}/${backlogData.totalStudents} students)
1-backlog: ${backlogData.summary.studentsWithOneBacklog}, 2-backlogs: ${backlogData.summary.studentsWithTwoBacklogs}, 3+backlogs: ${backlogData.summary.studentsWithThreePlus}
Worst dept: ${worstDept?.department} (${worstDept?.studentsAffected} affected, ${worstDept?.totalBacklogs} backlogs)
Critical semester: Semester ${worstSem?.semester} (${worstSem?.studentsWithBacklogs} students with backlogs)

Write 4 formal sentences:
1. Severity assessment: Low/Moderate/High/Critical — with specific percentage justification
2. Department concern — curriculum or student effort issue?
3. Critical semester identification and teaching review needed
4. Intervention recommendation for students with 3+ backlogs
Formal academic language. No headers.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 5: Placement Forecast ────────────────────────────────────
export async function generatePlacementForecast(placementData) {
  const summary = placementData.institutionSummary;

  const prompt = `Placement forecast for annual report:
Overall: ${summary.totalPlaced}/${summary.totalEligible} placed (${summary.overallPlacementRate}%), Top package: ${summary.topPackage} LPA, Avg median: ${summary.averageMedianPackage} LPA
Departments: ${placementData.byDepartment.map(d=>`${d.department}:${d.placementRate}%`).join(' | ')}
Top recruiters: ${placementData.topRecruiters.slice(0,5).join(', ')}
Industry benchmark: 70% placement rate

Write 4 formal sentences:
1. Current rate vs 70% benchmark — MEETS or BELOW with specific gap
2. Best and worst placement department with rates
3. Forecast for next year (trend-based prediction with percentage)
4. Top action to improve placement by 5-10%
Formal placement cell language. No headers.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 6: Faculty Contribution ──────────────────────────────────
export async function generateFacultyContributionSummary(facultyData) {
  const ratio = (facultyData.totalPublications / Math.max(facultyData.totalFaculty, 1)).toFixed(2);
  const topFac = [...facultyData.byFaculty].sort((a, b) => b.count - a.count)[0];

  const prompt = `Faculty contribution for NBA Criterion 4 compliance:
Dept: ${facultyData.department}, Faculty: ${facultyData.totalFaculty}, Publications: ${facultyData.totalPublications}
Ratio: ${ratio} pubs/faculty (NBA benchmark: 1 per faculty per 3 years = 0.33 min)
Types: Journal:${facultyData.byType?.Journal||0}, Conference:${facultyData.byType?.Conference||0}, Patent:${facultyData.byType?.Patent||0}, Book:${facultyData.byType?.['Book Chapter']||0}
Top contributor: ${topFac?.faculty} (${topFac?.count} publications)

Write 4 formal sentences:
1. Overall research output assessment vs NBA benchmark
2. Publication quality — journal-heavy or conference-heavy and accreditation impact
3. NBA Criterion 4: state COMPLIANT or NON-COMPLIANT with specific justification
4. One recommendation to improve output from low-contributing faculty
Formal IQAC language. No headers.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 7: Accreditation Readiness ──────────────────────────────
export async function generateAccreditationReadinessAssessment(readinessData) {
  const cacheKey = `accreditation_${Math.round(Date.now() / CACHE_TTL)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const nba = readinessData.nba;
  const naac = readinessData.naac;
  const verdict = (nba.readinessScore > 80 && naac.readinessScore > 80) ? "READY FOR AUDIT"
    : (nba.readinessScore > 60 && naac.readinessScore > 60) ? "REQUIRES ATTENTION"
    : "CRITICAL - NOT READY";

  const prompt = `Accreditation readiness assessment:
NBA: ${nba.readinessScore}% (${nba.completedItems}/${nba.totalItems} criteria done)
Top missing NBA: ${nba.missingItems?.slice(0,2).map(i=>i.title).join('; ') || 'none'}
NAAC: ${naac.readinessScore}% (${naac.completedItems}/${naac.totalItems} criteria done)
Top missing NAAC: ${naac.missingItems?.slice(0,2).map(i=>i.title).join('; ') || 'none'}
Overall verdict: ${verdict}

Write 4 formal sentences:
1. State verdict clearly with both scores
2. Most critical missing NBA item and audit risk
3. Most critical missing NAAC item and impact
4. Top priority action with timeline (1 week/2 weeks/1 month)
Formal IQAC committee language. No headers.`;

  const result = await callMistral(prompt, 200);
  setCache(cacheKey, result);
  return result;
}

// ─── JOB 8: Natural Language Query ────────────────────────────────
export async function answerNaturalLanguageQuery(question, databaseSummary) {
  const d = databaseSummary;
  const deptStr = (d.departments || []).slice(0, 5)
    .map(dept => `${dept.code || dept.name}:CGPA${dept.averageCgpa},Pass${dept.passPercent}%,Place${dept.placementRate}%`)
    .join(' | ');

  const prompt = `IQAC database facts:
Students: ${d.totalStudents} total (High risk: ${d.highRiskCount}, Medium: ${d.mediumRiskCount}, Low: ${d.lowRiskCount})
Avg CGPA: ${d.averageCgpa}, Attendance shortage: ${d.attendanceShortageCount} students below 75%
Departments: ${deptStr}
NBA readiness: ${d.accreditation?.nbaReadiness}%, NAAC: ${d.accreditation?.naacReadiness}%

Question: "${question}"

Answer in maximum 2 sentences using ONLY the facts above.
First sentence: direct answer with specific number from the data.
Second sentence: brief context or implication.
If insufficient data: reply "Insufficient data available for this query."`;

  return await callMistral(prompt, 120);
}
