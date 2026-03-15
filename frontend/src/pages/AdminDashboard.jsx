import { useEffect, useMemo, useState } from "react";
import client from "../api/client";

import StatCard from "../components/StatCard.jsx";
import AdminSidebar from "../components/AdminSidebar.jsx";
import { useState as useReactState } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [entities, setEntities] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [reportType, setReportType] = useState("DEPARTMENT_PERFORMANCE");
  const [studentCompare, setStudentCompare] = useState(null);
  const [sectionComparisonRows, setSectionComparisonRows] = useState([]);
  const [form, setForm] = useState({
    departmentName: "",
    departmentCode: "",
    facultyName: "",
    facultyEmail: "",
    facultyDepartmentId: "",
    studentName: "",
    studentEmail: "",
    rollNo: "",
    studentDepartmentId: "",
    studentSectionId: "",
    sectionName: "",
    sectionCode: "",
    sectionSemester: 4,
    sectionDepartmentId: "",
    facultyAssigneeId: "",
    assignDepartmentId: ""
  });
  // Sidebar navigation state
  const [activeNav, setActiveNav] = useReactState("overview");

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [generatingReportType, setGeneratingReportType] = useState(null);
  const [aiSearchQuestion, setAiSearchQuestion] = useState("");
  const [aiSearchAnswer, setAiSearchAnswer] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [accreditationAssessment, setAccreditationAssessment] = useState(null);

  const generateAIReport = async (rType) => {
    setGeneratingReportType(rType);
    setAiAnalysis("");
    try {
      let endpoint = "";
      if (rType === "STUDENT_PROGRESS") endpoint = "/ai/student-progress-report";
      if (rType === "DEPARTMENT_PERFORMANCE") endpoint = "/ai/department-performance";
      if (rType === "BACKLOG_ANALYSIS") endpoint = "/ai/backlog-analysis";
      if (rType === "PLACEMENT") endpoint = "/ai/placement-forecast";
      if (rType === "FACULTY_CONTRIBUTION") endpoint = "/ai/faculty-contribution";
      if (rType === "CGPA_DISTRIBUTION") endpoint = "/ai/cgpa-distribution";

      if (rType === "CGPA_DISTRIBUTION") {
        const res = await client.get(endpoint);
        setAiAnalysis(res.data.data.analysis);
      } else {
        const response = await client.post(endpoint, {}, { responseType: "blob" });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${rType}_AI_${Date.now()}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        setAiAnalysis("AI-powered PDF report downloaded successfully.");
      }
    } catch (err) {
      setAiAnalysis("Report generation failed. Please ensure Ollama is running.");
    }
    setGeneratingReportType(null);
  };

  const handleAISearch = async () => {
    if (!aiSearchQuestion.trim()) return;
    setAiSearchLoading(true);
    setAiSearchAnswer("");

    try {
      const token = localStorage.getItem("iqac_token");
      const response = await fetch("http://localhost:5000/api/ai/search-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ question: aiSearchQuestion })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.token) {
                setAiSearchAnswer(prev => prev + json.token);
              }
              if (json.error) {
                setAiSearchAnswer("Search failed. Please try again.");
              }
            } catch {}
          }
        }
      }
    } catch {
      setAiSearchAnswer("Search failed. Please try again.");
    }

    setAiSearchLoading(false);
  };

  const loadAccreditationAssessment = async () => {
    try {
      const res = await client.get("/ai/accreditation-readiness");
      setAccreditationAssessment(res.data.data);
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      const [overviewRes, entitiesRes, comparisonRes, readinessRes] = await Promise.all([
        client.get("/analytics/overview"),
        client.get("/admin/entities"),
        client.get("/analytics/department-comparison-extended"),
        client.get("/accreditation/readiness?type=NAAC")
      ]);

      setOverview(overviewRes.data.data);
      setEntities(entitiesRes.data.data);
      setComparison(comparisonRes.data.data);
      setReadiness(readinessRes.data.data);

      const sectionRes = await client.get("/analytics/section-comparison");
      setSectionComparisonRows(sectionRes.data.data || []);

      if (entitiesRes.data.data.departments?.length) {
        const firstDepartment = entitiesRes.data.data.departments[0];
        setForm((prev) => ({
          ...prev,
          facultyDepartmentId: firstDepartment._id,
          studentDepartmentId: firstDepartment._id,
          sectionDepartmentId: firstDepartment._id,
          studentSectionId: entitiesRes.data.data.sections?.[0]?._id || "",
          assignDepartmentId: firstDepartment._id,
          facultyAssigneeId: entitiesRes.data.data.faculties?.[0]?.user?._id || ""
        }));
      }

      if ((entitiesRes.data.data.students || []).length >= 2) {
        const studentA = entitiesRes.data.data.students[0]._id;
        const studentB = entitiesRes.data.data.students[1]._id;
        const compareRes = await client.get(`/analytics/student-comparison?studentIdA=${studentA}&studentIdB=${studentB}`);
        setStudentCompare(compareRes.data.data);
      }
    };

    load();
    loadAccreditationAssessment();
  }, []);

  const refreshAdminData = async () => {
    const [entitiesRes, comparisonRes, sectionRes] = await Promise.all([
import Sidebar from "../components/Sidebar.jsx";
import StatsCards from "../components/StatsCards.jsx";
import RiskChart from "../components/RiskChart.jsx";
import DepartmentChart from "../components/DepartmentChart.jsx";
import AddFacultyDrawer from "../components/AddFacultyDrawer.jsx";

const NAV_ITEMS = [
  "Overview",
  "Add Department",
  "Add Faculty",
  "Accreditation Report",
  "Department Compare",
  "Institutional Analysis"
];

export default function AdminDashboard() {
  const [activeItem, setActiveItem] = useState("Overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entities, setEntities] = useState({ departments: [], faculties: [], students: [] });
  const [analytics, setAnalytics] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [departmentComparisonRows, setDepartmentComparisonRows] = useState([]);

  const loadDashboard = async () => {
    const [entitiesRes, analyticsRes, facultyRes, departmentCompareRes] = await Promise.all([
      client.get("/admin/entities"),
      client.get("/admin/analytics"),
      client.get("/faculty"),
      client.get("/admin/department-comparison")
    ]);

    setEntities(entitiesRes.data.data || { departments: [], faculties: [], students: [] });
    setAnalytics(analyticsRes.data.data || null);
    setFaculties(facultyRes.data.data || []);
    setDepartmentComparisonRows(departmentCompareRes.data.data || []);
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, []);

  useEffect(() => {
    if (activeItem === "Add Faculty") {
      setDrawerOpen(true);
    }
  }, [activeItem]);

  const stats = useMemo(
    () => [
      {
        title: "Total Students",
        value: String(analytics?.summary?.totalStudents || entities.students?.length || 0),
        trend: "+4.1%",
        trendUp: true,
        color: "from-blue-500/70 via-sky-400/70 to-cyan-300/70"
      },
      {
        title: "Total Faculty",
        value: String(analytics?.summary?.totalFaculties || faculties.length || 0),
        trend: "+0.12",
        trendUp: true,
        color: "from-emerald-500/65 via-teal-400/65 to-cyan-300/65"
      },
      {
        title: "Departments",
        value: String(analytics?.summary?.totalDepartments || entities.departments?.length || 0),
        trend: "+2.6%",
        trendUp: true,
        color: "from-indigo-500/65 via-violet-400/65 to-fuchsia-300/65"
      },
      {
        title: "Faculty Achievements",
        value: String(analytics?.summary?.totalFacultyAchievements || 0),
        trend: "-0.8%",
        trendUp: false,
        color: "from-amber-500/65 via-orange-400/65 to-rose-300/65"
      }
    ],
    [analytics, entities, faculties]
  );

  const riskDistribution = useMemo(() => {
    const rows = analytics?.departmentComparison || [];
    const sums = rows.reduce(
      (acc, row) => {
        acc.high += Number(row.riskDistribution?.high || 0);
        acc.medium += Number(row.riskDistribution?.medium || 0);
        acc.low += Number(row.riskDistribution?.low || 0);
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );

    return [
      { name: "High Risk", value: sums.high, color: "#ef4444" },
      { name: "Medium Risk", value: sums.medium, color: "#f97316" },
      { name: "Low Risk", value: sums.low, color: "#16a34a" }
    ];
  }, [analytics]);

  const departmentComparison = useMemo(() => {
    return (departmentComparisonRows || []).map((row) => ({
      department: row.department,
      passPercentage: Number(row.passPercentage || 0),
      placementRate: Number(row.placementRate || 0),
      averageCGPA: Number(row.averageCGPA || 0)
    }));
  }, [departmentComparisonRows]);

  const facultyByDepartment = useMemo(() => {
    const buckets = new Map();
    faculties.forEach((row) => {
      const key = row.department?.code || row.department?.name || "UNASSIGNED";
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [faculties]);

  const handleCreateFaculty = async (payload) => {
    setSubmitting(true);
    try {
      await client.post("/faculty/add", payload);
      await loadDashboard();
      setActiveItem("Overview");
      setDrawerOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[78vh] gap-6 lg:grid-cols-[260px,1fr]">
      <Sidebar items={NAV_ITEMS} activeItem={activeItem} onSelect={setActiveItem} />

      <section className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/45 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.16),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(243,248,254,0.92))] p-5 shadow-xl shadow-slate-200/40 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/65">IQAC Academic Intelligence</p>
              <h1 className="mt-2 font-heading text-2xl text-brand-ink sm:text-3xl">University Analytics Control Panel</h1>
              <p className="mt-1 text-sm text-brand-ink/75">
                Institutional metrics, faculty intelligence, accreditation readiness, and department comparisons in one cockpit.
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl bg-gradient-to-r from-brand-ink to-brand-ocean px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
            >
              Add Faculty
            </button>
          </div>
        </header>

        {activeItem === "Overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} />

            <div className="grid gap-5 xl:grid-cols-2">
              <RiskChart data={riskDistribution} />
              <DepartmentChart data={departmentComparison} />
            </div>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Department Faculty Distribution</h3>
              <p className="mt-1 text-sm text-brand-ink/75">This updates instantly whenever a new faculty profile is created.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {facultyByDepartment.map((row) => (
                  <article key={row.department} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-brand-ink/60">{row.department}</p>
                    <p className="mt-2 text-3xl font-semibold text-brand-ink">{row.count}</p>
                    <p className="text-xs text-brand-ink/70">Faculty members</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/45 bg-white/45 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md">
              <h3 className="font-heading text-xl text-brand-ink">Faculty Directory Snapshot</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Employee ID</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Designation</th>
                      <th className="px-3 py-2">Sections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculties.slice(0, 8).map((row) => (
                      <tr key={row._id} className="border-t border-brand-ink/10">
                        <td className="px-3 py-2 font-medium text-brand-ink">{row.name}</td>
                        <td className="px-3 py-2">{row.employeeId}</td>
                        <td className="px-3 py-2">{row.department?.code || row.department?.name}</td>
                        <td className="px-3 py-2">{row.designation}</td>
                        <td className="px-3 py-2">{(row.sections || []).join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeItem !== "Overview" && activeItem !== "Add Faculty" && (
          <section className="rounded-3xl border border-white/45 bg-white/45 p-6 shadow-xl shadow-slate-200/35 backdrop-blur-md">
            <h3 className="font-heading text-xl text-brand-ink">{activeItem}</h3>
            <p className="mt-2 text-sm text-brand-ink/75">
              This panel is ready for workflow integration. The analytics widgets above are fully functional with mock institutional JSON data.
            </p>
            {activeItem === "Department Compare" && (
              <div className="mt-6">
                <DepartmentChart data={departmentComparison} />
              </div>
            )}
          </section>
        )}

        {activeItem === "Add Faculty" && (
          <section className="rounded-3xl border border-white/45 bg-white/45 p-6 shadow-xl shadow-slate-200/35 backdrop-blur-md">
            <h3 className="font-heading text-xl text-brand-ink">Faculty Management</h3>
            <p className="mt-2 text-sm text-brand-ink/75">Use the Add Faculty button to open the full profile creation drawer.</p>
            <button onClick={() => setDrawerOpen(true)} className="mt-4 rounded-xl bg-brand-ink px-4 py-2 text-white">Open Add Faculty</button>
          </section>
        )}
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Automated Report Generation</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="rounded-lg border border-brand-ink/20 px-3 py-2"
          >
            <option value="STUDENT_PROGRESS">Student Progress Report</option>
            <option value="DEPARTMENT_PERFORMANCE">Department Performance Report</option>
            <option value="CGPA_DISTRIBUTION">CGPA Distribution Report</option>
            <option value="BACKLOG_ANALYSIS">Backlog Analysis Report</option>
            <option value="PLACEMENT">Placement Report</option>
            <option value="FACULTY_CONTRIBUTION">Faculty Contribution Report</option>
          </select>
          <button onClick={() => downloadReport("PDF")} className="rounded-lg bg-brand-ink px-4 py-2 text-white">
            Download PDF
          </button>
          <button onClick={() => downloadReport("EXCEL")} className="rounded-lg bg-brand-ocean px-4 py-2 text-white">
            Download Excel
          </button>
        </div>
      </section>

      {/* ── AI NATURAL LANGUAGE SEARCH ── */}
      <section className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-6">
        <h3 className="font-heading text-lg text-brand-ink">🤖 Ask IQAC Data Assistant</h3>
        <p className="text-sm text-brand-ink/60 mt-1">Ask any question about students, departments, placements or accreditation</p>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={aiSearchQuestion}
            onChange={(e) => setAiSearchQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
            placeholder="e.g. Which department has lowest CGPA?"
            className="flex-1 rounded-lg border border-purple-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={handleAISearch}
            disabled={aiSearchLoading}
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiSearchLoading ? "Thinking..." : "Ask AI"}
          </button>
        </div>
        {aiSearchAnswer && (
          <div className="mt-4 rounded-lg bg-white border border-purple-200 p-4">
            <p className="text-sm leading-7 text-brand-ink/90 whitespace-pre-wrap">{aiSearchAnswer}</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Which department needs most attention?",
            "How many students are at high risk?",
            "Is our institution ready for NBA?",
            "What is the placement rate this year?"
          ].map((q) => (
            <button
              key={q}
              onClick={() => setAiSearchQuestion(q)}
              className="rounded-full border border-purple-300 bg-white px-3 py-1 text-xs text-purple-700 hover:bg-purple-100 transition"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* ── AI-POWERED REPORT GENERATION ── */}
      <section className="rounded-2xl border border-white/40 bg-white/80 p-6">
        <h3 className="font-heading text-lg text-brand-ink">📊 AI-Powered Report Generation</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { type: "STUDENT_PROGRESS", title: "Student Progress", desc: "Comprehensive progress analysis with CGPA trends and risk assessment", color: "bg-blue-600" },
            { type: "DEPARTMENT_PERFORMANCE", title: "Department Performance", desc: "Comparative department ranking with NBA composite scores", color: "bg-green-600" },
            { type: "CGPA_DISTRIBUTION", title: "CGPA Distribution", desc: "Distribution analysis with NBA threshold compliance check", color: "bg-amber-600" },
            { type: "BACKLOG_ANALYSIS", title: "Backlog Analysis", desc: "Backlog patterns by department and semester with intervention plan", color: "bg-red-600" },
            { type: "PLACEMENT", title: "Placement Forecast", desc: "Placement trends, recruiter analysis, and next year predictions", color: "bg-indigo-600" },
            { type: "FACULTY_CONTRIBUTION", title: "Faculty Contribution", desc: "Research output assessment with NBA Criterion 4 compliance", color: "bg-teal-600" }
          ].map((r) => (
            <div key={r.type} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-brand-ink">{r.title}</h4>
                <p className="text-xs text-brand-ink/60 mt-1">{r.desc}</p>
              </div>
              <button
                onClick={() => generateAIReport(r.type)}
                disabled={generatingReportType !== null}
                className={`mt-3 w-full rounded-lg ${r.color} px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50`}
              >
                {generatingReportType === r.type ? "Generating..." : "Generate AI Report"}
              </button>
            </div>
          ))}
        </div>
        {aiAnalysis && (
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm leading-7 text-brand-ink/80 whitespace-pre-wrap">{aiAnalysis}</p>
          </div>
        )}
      </section>

      {/* ── ACCREDITATION READINESS ASSESSMENT ── */}
      {accreditationAssessment && (
        <section className="rounded-2xl border border-white/40 bg-white/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg text-brand-ink">🏅 AI Accreditation Readiness Assessment</h3>
            <button onClick={loadAccreditationAssessment} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
              Refresh Assessment
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-xs text-brand-ink/60 uppercase">NBA Readiness</p>
              <p className={`text-4xl font-bold mt-1 ${
                accreditationAssessment.nba.readinessScore > 80 ? "text-green-600" :
                accreditationAssessment.nba.readinessScore > 60 ? "text-yellow-600" : "text-red-600"
              }`}>{accreditationAssessment.nba.readinessScore}%</p>
              <p className="text-xs mt-1">{accreditationAssessment.nba.completedItems}/{accreditationAssessment.nba.totalItems} items</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-xs text-brand-ink/60 uppercase">NAAC Readiness</p>
              <p className={`text-4xl font-bold mt-1 ${
                accreditationAssessment.naac.readinessScore > 80 ? "text-green-600" :
                accreditationAssessment.naac.readinessScore > 60 ? "text-yellow-600" : "text-red-600"
              }`}>{accreditationAssessment.naac.readinessScore}%</p>
              <p className="text-xs mt-1">{accreditationAssessment.naac.completedItems}/{accreditationAssessment.naac.totalItems} items</p>
            </div>
            <div className="rounded-xl border p-4 text-center flex flex-col items-center justify-center">
              <p className="text-xs text-brand-ink/60 uppercase">Overall Verdict</p>
              <span className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-bold text-white ${
                accreditationAssessment.overallVerdict === "READY" ? "bg-green-600" :
                accreditationAssessment.overallVerdict === "REQUIRES ATTENTION" ? "bg-yellow-500" : "bg-red-600"
              }`}>{accreditationAssessment.overallVerdict}</span>
            </div>
          </div>
          {accreditationAssessment.assessment && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <h4 className="font-semibold text-sm text-brand-ink mb-2">AI Assessment</h4>
              <p className="text-sm leading-7 text-brand-ink/80 whitespace-pre-wrap">{accreditationAssessment.assessment}</p>
            </div>
          )}
        </section>
      )}
      </div>
      <AddFacultyDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          if (activeItem === "Add Faculty") setActiveItem("Overview");
        }}
        departments={entities.departments || []}
        onSubmit={handleCreateFaculty}
        loading={submitting}
      />
    </div>
  );
}
