import { Bar } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DepartmentComparisonChart({ rows }) {
  const labels = rows.map((r) => r.code);

  const data = {
    labels,
    datasets: [
      {
        label: "Pass %",
        data: rows.map((r) => r.passPercent),
        backgroundColor: "#0D6EFD"
      },
      {
        label: "Placement %",
        data: rows.map((r) => r.placementRate),
        backgroundColor: "#66D1C1"
      }
    ]
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
      <h3 className="font-heading text-lg text-brand-ink">Department Comparison</h3>
      <div className="mt-4 h-80">
        <Bar data={data} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  );
}
