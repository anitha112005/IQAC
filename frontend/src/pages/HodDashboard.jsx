import { useAuth } from "../context/AuthContext.jsx";

export default function HodDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/40 bg-white/80 p-8 shadow-sm">
        <h2 className="font-heading text-2xl font-bold text-brand-ink">
          HOD Dashboard
        </h2>
        <p className="mt-2 text-brand-ink/70">
          Welcome, {user?.name}. This is your departmental overview.
        </p>
      </div>
      {/* Add HOD specific components here later */}
    </div>
  );
}
