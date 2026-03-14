import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function HodDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [achievements, setAchievements] = useState({ facultyAchievements: [], studentAchievements: [] });
  const [performance, setPerformance] = useState(null);
  const [riskStudents, setRiskStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState({ search: "", section: "", sort: "desc" });
  const [facultyFilter, setFacultyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [placementForm, setPlacementForm] = useState({
    academicYear: "2025-26",
    totalEligible: 120,
    totalPlaced: 88,
    highestPackageLPA: 18,
    medianPackageLPA: 7.5
  });

  const menu = [
    { key: "dashboard", label: "Dashboard" },
    { key: "students", label: "Students" },
    { key: "sections", label: "Sections" },
    { key: "faculty", label: "Faculty" },
    { key: "achievements", label: "Achievements" },
    { key: "analytics", label: "Analytics" },
    { key: "risk", label: "Risk Alerts" },
    { key: "reports", label: "Reports" }
  ];

  const loadAll = async (filters = studentFilters, facultyDesignation = facultyFilter) => {
    if (!user?.department?._id) return;
    setLoading(true);

    const departmentId = user.department._id;
    const query = new URLSearchParams({
      search: filters.search || "",
      section: filters.section || "",
      sort: filters.sort || "desc"
    }).toString();

    const facultyQuery = new URLSearchParams({ designation: facultyDesignation || "" }).toString();

    const [overviewRes, studentsRes, sectionsRes, facultyRes, achievementsRes, performanceRes, riskRes] = await Promise.all([
      client.get(`/departments/${departmentId}/overview`),
      client.get(`/departments/${departmentId}/students?${query}`),
      client.get(`/departments/${departmentId}/sections`),
      client.get(`/departments/${departmentId}/faculty?${facultyQuery}`),
      client.get(`/departments/${departmentId}/achievements`),
      client.get(`/departments/${departmentId}/performance-analytics`),
      client.get(`/departments/${departmentId}/risk-students`)
    ]);

    setOverview(overviewRes.data.data);
    setStudents(studentsRes.data.data || []);
    setSections(sectionsRes.data.data || []);
    setFaculty(facultyRes.data.data || []);
    setAchievements(achievementsRes.data.data || { facultyAchievements: [], studentAchievements: [] });
    setPerformance(performanceRes.data.data);
    setRiskStudents(riskRes.data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  const applyStudentFilters = async (e) => {
    e?.preventDefault();
    await loadAll(studentFilters, facultyFilter);
  };

  const applyFacultyFilter = async (value) => {
    setFacultyFilter(value);
    await loadAll(studentFilters, value);
  };

  const savePlacement = async (e) => {
    e.preventDefault();
    await client.post(`/departments/${user.department._id}/placement`, placementForm);
    await loadAll();
  };

  const downloadReport = async (reportType, format) => {
    const response = await client.post(
      "/reports/generate",
      {
        reportType,
        format,
        department: user.department._id,
        section: studentFilters.section || undefined
      },
      { responseType: "blob" }
    );

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}.${format === "PDF" ? "pdf" : "xlsx"}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sectionChartData = useMemo(() => ({
    labels: sections.map((s) => `Sec ${s.section}`),
    datasets: [
      { label: "Avg CGPA", data: sections.map((s) => s.averageCgpa), backgroundColor: "#0D6EFD" },
      { label: "Pass %", data: sections.map((s) => s.passPercentage), backgroundColor: "#66D1C1" }
    ]
  }), [sections]);

  if (!user?.department) return <div>Department mapping missing for this HOD account.</div>;
  if (loading || !overview || !performance) return <div className="text-brand-ink">Loading department dashboard...</div>;

  return (
    <div className="min-h-[76vh] rounded-3xl border border-white/40 bg-gradient-to-br from-[#f1f8ff] via-[#f8f6ff] to-[#fff6ef] p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
        <aside className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/65">Department</p>
          <h2 className="mt-1 font-heading text-xl text-brand-ink">{user.department.name}</h2>
          <p className="text-sm text-brand-ink/70">HOD Control Panel</p>
          <nav className="mt-6 space-y-2">
            {menu.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${activeTab === item.key ? "bg-brand-ink text-white" : "bg-white text-brand-ink hover:bg-brand-sand"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          {activeTab === "dashboard" && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card title="Total Students" value={overview.cards.totalStudents} />
                <Card title="Total Faculty" value={overview.cards.totalFaculty} color="from-[#0d6efd] to-[#48cae4]" />
                <Card title="Sections" value={overview.cards.numberOfSections} color="from-[#f77f00] to-[#fcbf49]" />
                <Card title="Average CGPA" value={overview.cards.averageDepartmentCgpa} color="from-[#2a9d8f] to-[#52b788]" />
                <Card title="Students with Backlogs" value={overview.cards.studentsWithBacklogs} />
                <Card title="Above 9 CGPA" value={overview.cards.studentsAbove9Cgpa} color="from-[#7b2cbf] to-[#c77dff]" />
                <Card title="Faculty with PhD" value={overview.cards.facultyWithPhd} color="from-[#00b4d8] to-[#90e0ef]" />
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Panel title="CGPA Distribution">
                  <div className="h-72">
                    <Doughnut
                      data={{
                        labels: ["<6", "6-7", "7-8", "8-9", ">=9"],
                        datasets: [{
                          data: [
                            overview.cgpaDistribution.below6,
                            overview.cgpaDistribution.between6And7,
                            overview.cgpaDistribution.between7And8,
                            overview.cgpaDistribution.between8And9,
                            overview.cgpaDistribution.above9
                          ],
                          backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#6366f1", "#10b981"]
                        }]
                      }}
                      options={{ maintainAspectRatio: false }}
                    />
                  </div>
                </Panel>

                <Panel title="Attendance Overview by Section">
                  <div className="h-72">
                    <Bar
                      data={{
                        labels: overview.attendanceOverview.map((a) => `Sec ${a.section}`),
                        datasets: [{ label: "Attendance %", data: overview.attendanceOverview.map((a) => a.attendancePercent), backgroundColor: "#0d6efd" }]
                      }}
                      options={{ maintainAspectRatio: false }}
                    />
                  </div>
                </Panel>
              </section>

              <Panel title="Section Performance Comparison">
                <div className="h-72">
                  <Bar data={sectionChartData} options={{ maintainAspectRatio: false }} />
                </div>
              </Panel>
            </>
          )}

          {activeTab === "students" && (
            <Panel title="Student Management">
              <form onSubmit={applyStudentFilters} className="grid gap-3 sm:grid-cols-4">
                <input value={studentFilters.search} onChange={(e) => setStudentFilters((p) => ({ ...p, search: e.target.value }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Search by name or roll" />
                <input value={studentFilters.section} onChange={(e) => setStudentFilters((p) => ({ ...p, section: e.target.value.toUpperCase() }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Filter section" />
                <select value={studentFilters.sort} onChange={(e) => setStudentFilters((p) => ({ ...p, sort: e.target.value }))} className="rounded-lg border border-brand-ink/20 px-3 py-2">
                  <option value="desc">Sort CGPA High-Low</option>
                  <option value="asc">Sort CGPA Low-High</option>
                </select>
                <button className="rounded-lg bg-brand-ink px-4 py-2 text-white">Apply</button>
              </form>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Roll Number</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Semester</th>
                      <th className="px-3 py-2">CGPA</th>
                      <th className="px-3 py-2">Attendance %</th>
                      <th className="px-3 py-2">Backlogs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s._id} className={`border-t ${s.atRisk ? "bg-red-50/80" : ""}`}>
                        <td className="px-3 py-2">{s.rollNo}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2">{s.section}</td>
                        <td className="px-3 py-2">{s.semester}</td>
                        <td className="px-3 py-2">{s.cgpa}</td>
                        <td className="px-3 py-2">{s.attendancePercent}</td>
                        <td className="px-3 py-2">{s.backlogs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === "sections" && (
            <Panel title="Section Wise Analysis">
              <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-brand-ink/70">
                      <tr>
                        <th className="px-3 py-2">Section</th>
                        <th className="px-3 py-2">Students</th>
                        <th className="px-3 py-2">Avg CGPA</th>
                        <th className="px-3 py-2">Pass %</th>
                        <th className="px-3 py-2">Backlogs</th>
                        <th className="px-3 py-2">Indicator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((sec) => (
                        <tr key={sec.section} className="border-t">
                          <td className="px-3 py-2">{sec.section}</td>
                          <td className="px-3 py-2">{sec.totalStudents}</td>
                          <td className="px-3 py-2">{sec.averageCgpa}</td>
                          <td className="px-3 py-2">{sec.passPercentage}%</td>
                          <td className="px-3 py-2">{sec.studentsWithBacklogs}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${sec.indicator === "GREEN" ? "bg-green-100 text-green-700" : sec.indicator === "YELLOW" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {sec.indicator}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-4">
                  <div className="h-64 rounded-xl border border-white/50 bg-white p-3">
                    <Bar data={sectionChartData} options={{ maintainAspectRatio: false }} />
                  </div>
                  <div className="rounded-xl border border-white/50 bg-white p-3">
                    <h4 className="font-semibold text-brand-ink">Top 5 Performers (Across Sections)</h4>
                    <ul className="mt-2 space-y-1 text-sm text-brand-ink/80">
                      {sections.flatMap((s) => s.topPerformers || []).sort((a, b) => b.cgpa - a.cgpa).slice(0, 5).map((p) => (
                        <li key={`${p.rollNo}-${p.name}`}>{p.rollNo} - {p.name} ({p.cgpa})</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {activeTab === "faculty" && (
            <Panel title="Faculty Management">
              <div className="mb-3 flex flex-wrap gap-2">
                {["", "assistant professor", "associate professor", "professor"].map((d) => (
                  <button key={d || "all"} onClick={() => applyFacultyFilter(d)} className={`rounded-full px-3 py-1 text-sm ${facultyFilter === d ? "bg-brand-ink text-white" : "bg-brand-sand text-brand-ink"}`}>
                    {d ? d.replace(/\b\w/g, (x) => x.toUpperCase()) : "All"}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Faculty Name</th>
                      <th className="px-3 py-2">Designation</th>
                      <th className="px-3 py-2">Subjects Handled</th>
                      <th className="px-3 py-2">Experience</th>
                      <th className="px-3 py-2">Qualification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty.map((f) => (
                      <tr key={f._id} className="border-t">
                        <td className="px-3 py-2">{f.name}</td>
                        <td className="px-3 py-2">{f.designation}</td>
                        <td className="px-3 py-2">{(f.subjectsHandled || []).join(", ") || "NA"}</td>
                        <td className="px-3 py-2">{f.experience} yrs</td>
                        <td className="px-3 py-2">{f.qualification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === "achievements" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Faculty Achievements">
                <div className="space-y-2">
                  {achievements.facultyAchievements.map((a) => (
                    <article key={a._id} className="rounded-xl border border-white/50 bg-white p-3">
                      <p className="font-semibold text-brand-ink">{a.title}</p>
                      <p className="text-sm text-brand-ink/75">{a.faculty?.name} • {a.category} • {a.level}</p>
                    </article>
                  ))}
                </div>
              </Panel>
              <Panel title="Student Achievements">
                <div className="space-y-2">
                  {achievements.studentAchievements.map((a) => (
                    <article key={a._id} className="rounded-xl border border-white/50 bg-white p-3">
                      <p className="font-semibold text-brand-ink">{a.eventName} - {a.title}</p>
                      <p className="text-sm text-brand-ink/75">{a.student?.name} ({a.student?.rollNo}) • {a.category} • {a.level}</p>
                    </article>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Average CGPA per Semester">
                <div className="h-64">
                  <Line
                    data={{
                      labels: performance.averageCgpaPerSemester.map((x) => `Sem ${x.semester}`),
                      datasets: [{ label: "Avg CGPA", data: performance.averageCgpaPerSemester.map((x) => x.averageCgpa), borderColor: "#0d6efd", backgroundColor: "rgba(13,110,253,0.12)", fill: true }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </Panel>

              <Panel title="Internship Participation %">
                <div className="h-64">
                  <Bar
                    data={{
                      labels: performance.internshipParticipation.map((x) => `Sem ${x.semester}`),
                      datasets: [{ label: "Internship %", data: performance.internshipParticipation.map((x) => x.percent), backgroundColor: "#66d1c1" }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </Panel>

              <Panel title="Placement Statistics">
                <div className="h-64">
                  <Bar
                    data={{
                      labels: performance.placementStatistics.map((x) => x.academicYear),
                      datasets: [{ label: "Placement %", data: performance.placementStatistics.map((x) => x.placementRate), backgroundColor: "#f59e0b" }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </Panel>

              <Panel title="Backlog Trends">
                <div className="h-64">
                  <Line
                    data={{
                      labels: performance.backlogTrends.map((x) => `Sem ${x.semester}`),
                      datasets: [{ label: "Backlog Rate", data: performance.backlogTrends.map((x) => x.backlogRate), borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.12)", fill: true }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "risk" && (
            <Panel title="Alerts / Risk Students">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-brand-ink/70">
                    <tr>
                      <th className="px-3 py-2">Roll No</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">CGPA</th>
                      <th className="px-3 py-2">Attendance</th>
                      <th className="px-3 py-2">Backlogs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskStudents.map((s) => (
                      <tr key={s._id} className="border-t bg-red-50/70">
                        <td className="px-3 py-2">{s.rollNo}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2">{s.section}</td>
                        <td className="px-3 py-2">{s.cgpa}</td>
                        <td className="px-3 py-2">{s.attendancePercent}%</td>
                        <td className="px-3 py-2">{s.backlogs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {activeTab === "reports" && (
            <Panel title="Reports and Downloads">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/50 bg-white p-4">
                  <h4 className="font-semibold text-brand-ink">Export Reports</h4>
                  <p className="mt-1 text-sm text-brand-ink/70">PDF / Excel for student performance, section-wise, and faculty activity.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => downloadReport("STUDENT_PROGRESS", "PDF")} className="rounded-lg bg-brand-ink px-3 py-2 text-sm text-white">Student PDF</button>
                    <button onClick={() => downloadReport("STUDENT_PROGRESS", "EXCEL")} className="rounded-lg bg-brand-ocean px-3 py-2 text-sm text-white">Student Excel</button>
                    <button onClick={() => downloadReport("SECTION_WISE", "PDF")} className="rounded-lg bg-brand-ink px-3 py-2 text-sm text-white">Section PDF</button>
                    <button onClick={() => downloadReport("SECTION_WISE", "EXCEL")} className="rounded-lg bg-brand-ocean px-3 py-2 text-sm text-white">Section Excel</button>
                    <button onClick={() => downloadReport("FACULTY_CONTRIBUTION", "PDF")} className="rounded-lg bg-brand-ink px-3 py-2 text-sm text-white">Faculty PDF</button>
                    <button onClick={() => downloadReport("FACULTY_CONTRIBUTION", "EXCEL")} className="rounded-lg bg-brand-ocean px-3 py-2 text-sm text-white">Faculty Excel</button>
                  </div>
                </div>

                <form onSubmit={savePlacement} className="rounded-xl border border-white/50 bg-white p-4">
                  <h4 className="font-semibold text-brand-ink">Update Placement Statistics</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={placementForm.academicYear} onChange={(e) => setPlacementForm((p) => ({ ...p, academicYear: e.target.value }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Academic Year" />
                    <input type="number" value={placementForm.totalEligible} onChange={(e) => setPlacementForm((p) => ({ ...p, totalEligible: Number(e.target.value) }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Eligible" />
                    <input type="number" value={placementForm.totalPlaced} onChange={(e) => setPlacementForm((p) => ({ ...p, totalPlaced: Number(e.target.value) }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Placed" />
                    <input type="number" value={placementForm.highestPackageLPA} onChange={(e) => setPlacementForm((p) => ({ ...p, highestPackageLPA: Number(e.target.value) }))} className="rounded-lg border border-brand-ink/20 px-3 py-2" placeholder="Highest LPA" />
                    <input type="number" value={placementForm.medianPackageLPA} onChange={(e) => setPlacementForm((p) => ({ ...p, medianPackageLPA: Number(e.target.value) }))} className="rounded-lg border border-brand-ink/20 px-3 py-2 sm:col-span-2" placeholder="Median LPA" />
                  </div>
                  <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Save Placement</button>
                </form>
              </div>
            </Panel>
          )}
        </main>
      </div>
    </div>
  );
}

function Card({ title, value, color = "from-[#112a46] to-[#0d6efd]" }) {
  return (
    <article className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/60">{title}</p>
      <p className={`mt-2 bg-gradient-to-r ${color} bg-clip-text text-3xl font-semibold text-transparent`}>{value}</p>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-sm">
      <h3 className="font-heading text-lg text-brand-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
