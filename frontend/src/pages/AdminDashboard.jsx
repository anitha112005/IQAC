import { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  ArcElement
} from "chart.js";
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
      client.get("/admin/entities"),
      client.get("/analytics/department-comparison-extended"),
      client.get("/analytics/section-comparison")
    ]);
    setEntities(entitiesRes.data.data);
    setComparison(comparisonRes.data.data);
    setSectionComparisonRows(sectionRes.data.data || []);

    if ((entitiesRes.data.data.students || []).length >= 2) {
      const studentA = entitiesRes.data.data.students[0]._id;
      const studentB = entitiesRes.data.data.students[1]._id;
      const compareRes = await client.get(`/analytics/student-comparison?studentIdA=${studentA}&studentIdB=${studentB}`);
      setStudentCompare(compareRes.data.data);
    }
  };

  const onInput = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const createDepartment = async (e) => {
    e.preventDefault();
    await client.post("/admin/departments", { name: form.departmentName, code: form.departmentCode });
    setForm((prev) => ({ ...prev, departmentName: "", departmentCode: "" }));
    await refreshAdminData();
  };

  const createFaculty = async (e) => {
    e.preventDefault();
    await client.post("/admin/faculty", {
      name: form.facultyName,
      email: form.facultyEmail,
      departmentId: form.facultyDepartmentId
    });
    setForm((prev) => ({ ...prev, facultyName: "", facultyEmail: "" }));
    await refreshAdminData();
  };

  const createSection = async (e) => {
    e.preventDefault();
    await client.post("/admin/sections", {
      name: form.sectionName,
      code: form.sectionCode,
      semester: Number(form.sectionSemester),
      departmentId: form.sectionDepartmentId
    });
    setForm((prev) => ({ ...prev, sectionName: "", sectionCode: "" }));
    await refreshAdminData();
  };

  const createStudent = async (e) => {
    e.preventDefault();
    await client.post("/admin/students", {
      name: form.studentName,
      email: form.studentEmail,
      rollNo: form.rollNo,
      departmentId: form.studentDepartmentId,
      sectionId: form.studentSectionId,
      semester: 4,
      batch: "2023-2027"
    });
    setForm((prev) => ({ ...prev, studentName: "", studentEmail: "", rollNo: "" }));
    await refreshAdminData();
  };

  const assignFaculty = async (e) => {
    e.preventDefault();
    if (!form.facultyAssigneeId || !form.assignDepartmentId) return;
    await client.post(`/admin/faculty/${form.facultyAssigneeId}/assign-department`, {
      departmentId: form.assignDepartmentId
    });
    await refreshAdminData();
  };

  const renameDepartment = async (department) => {
    const newName = window.prompt("Enter updated department name", department.name);
    if (!newName || newName === department.name) return;
    await client.put(`/admin/departments/${department._id}`, { name: newName });
    await refreshAdminData();
  };

  const removeDepartment = async (departmentId) => {
    const confirmed = window.confirm("Delete this department?");
    if (!confirmed) return;
    await client.delete(`/admin/departments/${departmentId}`);
    await refreshAdminData();
  };

  const downloadReport = async (format = "PDF") => {
    const response = await client.post(
      "/reports/generate",
      { reportType, format },
      { responseType: "blob" }
    );

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportType}.${format === "PDF" ? "pdf" : "xlsx"}`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (!overview || !readiness || !entities) return <div className="text-brand-ink">Loading dashboard...</div>;

  const labels = comparison.map((row) => row.department);
  const passData = comparison.map((row) => row.passPercent);
  const cgpaData = comparison.map((row) => row.averageCgpa);
  const contributionData = comparison.map((row) => row.facultyContribution);
  const totalRisk = comparison.reduce(
    (acc, row) => {
      acc.high += row.riskDistribution.high;
      acc.medium += row.riskDistribution.medium;
      acc.low += row.riskDistribution.low;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return (
    <div className="flex min-h-screen bg-pattern">
      <AdminSidebar active={activeNav} onNavigate={setActiveNav} />
      <div className="flex-1 ml-64 p-8 space-y-6">
      {/* You can use activeNav to conditionally render sections if you want to switch views */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={overview.totalStudents} />
        <StatCard title="Average CGPA" value={overview.averageCgpa} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Placement Rate" value={`${overview.placementRate}%`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="NAAC Readiness" value={`${readiness.readinessScore}%`} accent="from-brand-flame to-brand-mint" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Departments" value={entities.departments.length} />
        <StatCard title="Faculties" value={entities.faculties.length} accent="from-brand-ocean to-brand-mint" />
        <StatCard title="Sections" value={entities.sections.length} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Students" value={entities.students.length} accent="from-brand-mint to-brand-flame" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <form onSubmit={createDepartment} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Add Department</h3>
          <div className="mt-3 space-y-2">
            <input name="departmentName" value={form.departmentName} onChange={onInput} placeholder="Department Name" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="departmentCode" value={form.departmentCode} onChange={onInput} placeholder="Code" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <button className="w-full rounded-lg bg-brand-ink px-4 py-2 text-white">Create</button>
          </div>
        </form>

        <form onSubmit={createFaculty} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Add Faculty</h3>
          <div className="mt-3 space-y-2">
            <input name="facultyName" value={form.facultyName} onChange={onInput} placeholder="Faculty Name" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="facultyEmail" value={form.facultyEmail} onChange={onInput} placeholder="Faculty Email" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <select name="facultyDepartmentId" value={form.facultyDepartmentId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              {entities.departments.map((d) => <option key={d._id} value={d._id}>{d.code}</option>)}
            </select>
            <button className="w-full rounded-lg bg-brand-ink px-4 py-2 text-white">Create</button>
          </div>
        </form>

        <form onSubmit={createSection} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Create Section</h3>
          <div className="mt-3 space-y-2">
            <input name="sectionName" value={form.sectionName} onChange={onInput} placeholder="Section Name" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="sectionCode" value={form.sectionCode} onChange={onInput} placeholder="Section Code" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="sectionSemester" value={form.sectionSemester} onChange={onInput} type="number" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <select name="sectionDepartmentId" value={form.sectionDepartmentId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              {entities.departments.map((d) => <option key={d._id} value={d._id}>{d.code}</option>)}
            </select>
            <button className="w-full rounded-lg bg-brand-ink px-4 py-2 text-white">Create</button>
          </div>
        </form>

        <form onSubmit={createStudent} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Create Student Account</h3>
          <div className="mt-3 space-y-2">
            <input name="studentName" value={form.studentName} onChange={onInput} placeholder="Student Name" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="studentEmail" value={form.studentEmail} onChange={onInput} placeholder="Student Email" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <input name="rollNo" value={form.rollNo} onChange={onInput} placeholder="Roll Number" className="w-full rounded-lg border border-brand-ink/20 px-3 py-2" />
            <select name="studentDepartmentId" value={form.studentDepartmentId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              {entities.departments.map((d) => <option key={d._id} value={d._id}>{d.code}</option>)}
            </select>
            <select name="studentSectionId" value={form.studentSectionId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              <option value="">Select Section</option>
              {entities.sections.map((s) => <option key={s._id} value={s._id}>{s.code}</option>)}
            </select>
            <button className="w-full rounded-lg bg-brand-ink px-4 py-2 text-white">Create</button>
          </div>
        </form>

        <form onSubmit={assignFaculty} className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Assign Faculty To Department</h3>
          <div className="mt-3 space-y-2">
            <select name="facultyAssigneeId" value={form.facultyAssigneeId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              {entities.faculties.map((f) => (
                <option key={f.user?._id} value={f.user?._id}>{f.user?.name} ({f.department?.code})</option>
              ))}
            </select>
            <select name="assignDepartmentId" value={form.assignDepartmentId} onChange={onInput} className="w-full rounded-lg border border-brand-ink/20 px-3 py-2">
              {entities.departments.map((d) => <option key={d._id} value={d._id}>{d.code}</option>)}
            </select>
            <button className="w-full rounded-lg bg-brand-ocean px-4 py-2 text-white">Assign</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Department Management</h3>
        <div className="mt-3 space-y-2 text-sm">
          {entities.departments.map((department) => (
            <div key={department._id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>{department.code} - {department.name}</span>
              <div className="flex gap-2">
                <button onClick={() => renameDepartment(department)} className="rounded bg-brand-ocean px-3 py-1 text-white">Edit</button>
                <button onClick={() => removeDepartment(department._id)} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Department Pass Percentage Comparison</h3>
          <div className="h-80">
            <Bar
              data={{ labels, datasets: [{ label: "Pass %", data: passData, backgroundColor: "rgba(13,110,253,0.6)" }] }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Department CGPA Comparison</h3>
          <div className="h-80">
            <Bar
              data={{ labels, datasets: [{ label: "Average CGPA", data: cgpaData, backgroundColor: "rgba(32,201,151,0.65)" }] }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Student Risk Heatmap by Department</h3>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[540px]">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-brand-ink/80">
              <div className="rounded bg-slate-100 p-2">Department</div>
              <div className="rounded bg-slate-100 p-2">High Risk</div>
              <div className="rounded bg-slate-100 p-2">Medium Risk</div>
              <div className="rounded bg-slate-100 p-2">Low Risk</div>
            </div>
            {comparison.map((row) => {
              const max = Math.max(row.riskDistribution.high, row.riskDistribution.medium, row.riskDistribution.low, 1);
              const tone = (value, base) => ({
                backgroundColor: `${base}${Math.min(0.92, 0.18 + value / max * 0.62)})`
              });

              return (
                <div key={row.departmentId} className="mt-2 grid grid-cols-4 gap-2 text-sm">
                  <div className="rounded bg-white px-3 py-2 font-medium">{row.department}</div>
                  <div className="rounded px-3 py-2" style={tone(row.riskDistribution.high, "rgba(220,53,69,")}>{row.riskDistribution.high}</div>
                  <div className="rounded px-3 py-2" style={tone(row.riskDistribution.medium, "rgba(255,193,7,")}>{row.riskDistribution.medium}</div>
                  <div className="rounded px-3 py-2" style={tone(row.riskDistribution.low, "rgba(32,201,151,")}>{row.riskDistribution.low}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Student vs Student Comparison</h3>
          {studentCompare ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="font-semibold">{studentCompare.studentA.name}</p>
                <p>CGPA: {studentCompare.studentA.cgpa}</p>
                <p>SGPA: {studentCompare.studentA.sgpa}</p>
                <p>Risk: {studentCompare.studentA.riskLevel}</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="font-semibold">{studentCompare.studentB.name}</p>
                <p>CGPA: {studentCompare.studentB.cgpa}</p>
                <p>SGPA: {studentCompare.studentB.sgpa}</p>
                <p>Risk: {studentCompare.studentB.riskLevel}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm">Need at least two students for comparison.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Section Performance Comparison</h3>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">
            {sectionComparisonRows.map((row) => (
              <div key={row.sectionId} className="rounded-lg bg-white px-3 py-2">
                <p className="font-semibold">{row.department} - {row.section}</p>
                <p>Pass %: {row.passPercent} | CGPA: {row.averageCgpa}</p>
                <p>Risk (H/M/L): {row.riskDistribution.high}/{row.riskDistribution.medium}/{row.riskDistribution.low}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Faculty Achievements Comparison</h3>
          <div className="h-72">
            <Bar
              data={{ labels, datasets: [{ label: "Faculty Achievements", data: contributionData, backgroundColor: "rgba(255,159,64,0.65)" }] }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
          <h3 className="font-heading text-lg text-brand-ink">Student Risk Distribution Across Departments</h3>
          <div className="h-72">
            <Pie
              data={{
                labels: ["High Risk", "Medium Risk", "Low Risk"],
                datasets: [{ data: [totalRisk.high, totalRisk.medium, totalRisk.low], backgroundColor: ["#dc3545", "#ffc107", "#20c997"] }]
              }}
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
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
    </div>
  );
}
