import { useEffect, useState } from "react";
import client from "../api/client";
import StatCard from "../components/StatCard.jsx";
import RiskDoughnut from "../components/RiskDoughnut.jsx";
import DepartmentComparisonChart from "../components/DepartmentComparisonChart.jsx";

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [reportType, setReportType] = useState("DEPARTMENT_PERFORMANCE");

  useEffect(() => {
    const load = async () => {
      const [overviewRes, comparisonRes, readinessRes] = await Promise.all([
        client.get("/analytics/overview"),
        client.get("/analytics/department-comparison"),
        client.get("/accreditation/readiness?type=NAAC")
      ]);

      setOverview(overviewRes.data.data);
      setComparison(comparisonRes.data.data);
      setReadiness(readinessRes.data.data);
    };

    load();
  }, []);

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

  if (!overview || !readiness) return <div className="text-brand-ink">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={overview.totalStudents} />
        <StatCard title="Average CGPA" value={overview.averageCgpa} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Placement Rate" value={`${overview.placementRate}%`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="NAAC Readiness" value={`${readiness.readinessScore}%`} accent="from-brand-flame to-brand-mint" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RiskDoughnut distribution={overview.riskDistribution} />
        <DepartmentComparisonChart rows={comparison} />
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
    </div>
  );
}
