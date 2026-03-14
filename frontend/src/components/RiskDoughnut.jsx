import { Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RiskDoughnut({ distribution }) {
  const data = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        data: [distribution.highRisk || 0, distribution.mediumRisk || 0, distribution.lowRisk || 0],
        backgroundColor: ["#FF6B35", "#FFB703", "#2A9D8F"],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/80 p-4">
      <h3 className="font-heading text-lg text-brand-ink">Student Risk Distribution</h3>
      <div className="mt-4 h-64">
        <Doughnut data={data} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  );
}
