import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";
import StatCard from "../components/StatCard.jsx";

export default function HodDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [form, setForm] = useState({
    academicYear: "2025-26",
    totalEligible: 120,
    totalPlaced: 88,
    highestPackageLPA: 18,
    medianPackageLPA: 7.5
  });

  useEffect(() => {
    if (!user?.department?._id) return;

    client.get(`/departments/${user.department._id}/analytics`).then((res) => setAnalytics(res.data.data));
  }, [user]);

  const addPlacement = async (e) => {
    e.preventDefault();
    await client.post(`/departments/${user.department._id}/placement`, form);
    const refreshed = await client.get(`/departments/${user.department._id}/analytics`);
    setAnalytics(refreshed.data.data);
  };

  if (!user?.department) return <div>Department mapping missing for this HOD account.</div>;
  if (!analytics) return <div className="text-brand-ink">Loading department analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-brand-ink">{user.department.name} Performance</h2>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Pass %" value={`${analytics.passPercent}%`} />
        <StatCard title="Average CGPA" value={analytics.averageCgpa} accent="from-brand-flame to-brand-ocean" />
        <StatCard title="Backlog Rate" value={`${analytics.backlogRate}%`} accent="from-brand-flame to-brand-mint" />
        <StatCard title="Placement Rate" value={`${analytics.placementRate}%`} accent="from-brand-mint to-brand-ocean" />
        <StatCard title="Achievements" value={analytics.achievements} accent="from-brand-ocean to-brand-flame" />
      </section>

      <form onSubmit={addPlacement} className="rounded-2xl border border-white/40 bg-white/80 p-4">
        <h3 className="font-heading text-lg text-brand-ink">Upload Placement Statistics</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Academic Year"
            value={form.academicYear}
            onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
            className="rounded-lg border border-brand-ink/20 px-3 py-2"
          />
          <input
            type="number"
            placeholder="Total Eligible"
            value={form.totalEligible}
            onChange={(e) => setForm((prev) => ({ ...prev, totalEligible: Number(e.target.value) }))}
            className="rounded-lg border border-brand-ink/20 px-3 py-2"
          />
          <input
            type="number"
            placeholder="Total Placed"
            value={form.totalPlaced}
            onChange={(e) => setForm((prev) => ({ ...prev, totalPlaced: Number(e.target.value) }))}
            className="rounded-lg border border-brand-ink/20 px-3 py-2"
          />
        </div>
        <button className="mt-3 rounded-lg bg-brand-ink px-4 py-2 text-white">Save Placement Data</button>
      </form>
    </div>
  );
}
