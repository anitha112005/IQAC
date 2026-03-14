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

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const generateAIReport = async () => {
    setAiLoading(true);
    try {
      const res = await client.post("/ai/accreditation-report");
      setAiAnalysis(res.data.data.analysis);
    } catch {
      setAiAnalysis("AI analysis unavailable.");
    }
    setAiLoading(false);
  };

  const generateAIPDF = async () => {
    setPdfLoading(true);
    try {
      // Gather context data from current state
      const contextData = {
        overview,
        comparison,
        readiness,
        aiAnalysis
      };

      const response = await client.post(
        "/ai/generate-pdf",
        contextData,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "IQAC_AI_Generated_Report.pdf";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Check console.");
    }
    setPdfLoading(false);
  };

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

      <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-brand-ink">
            AI-Generated NBA Accreditation Analysis
          </h3>
          <button
            onClick={generateAIReport}
            disabled={aiLoading}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {aiLoading ? "Analyzing..." : "Generate AI Report"}
          </button>
          <button
            onClick={generateAIPDF}
            disabled={pdfLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pdfLoading ? "Generating PDF..." : "Download AI PDF"}
          </button>
        </div>
        {aiAnalysis && (
          <p className="text-sm leading-7 text-brand-ink/80">{aiAnalysis}</p>
        )}
        {!aiAnalysis && (
          <p className="text-sm text-brand-ink/50">
            Click Generate to get AI-powered NBA accreditation assessment.
          </p>
        )}
      </section>
    </div>
  );
}
