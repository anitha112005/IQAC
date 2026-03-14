import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";
import StatCard from "../components/StatCard.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user?.studentProfile?._id) return;

    client.get(`/students/${user.studentProfile._id}/dashboard`).then((res) => setData(res.data.data));
  }, [user]);

  if (!data) return <div className="text-brand-ink">Loading student insights...</div>;

  const cgpaLabels = data.cgpaTrend.map((r) => `Sem ${r.semester}`);
  const cgpaValues = data.cgpaTrend.map((r) => r.cgpa);
  const latestAttendance = data.attendance.at(-1)?.percentage || 0;
  const latestBacklog = data.backlogBySemester.at(-1)?.backlogCount || 0;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">My Academic Progress</h2>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Current Risk" value={data.riskLevel} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Attendance" value={`${latestAttendance}%`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Backlogs" value={latestBacklog} accent="from-brand-ocean to-brand-flame" />
      </section>

      <section className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">CGPA Trend</h3>
        <div className="mt-4 h-80">
          <Line
            data={{
              labels: cgpaLabels,
              datasets: [
                {
                  label: "CGPA",
                  data: cgpaValues,
                  borderColor: "#0D6EFD",
                  backgroundColor: "rgba(13,110,253,0.15)",
                  fill: true,
                  tension: 0.3
                }
              ]
            }}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </section>
    </div>
  );
}
