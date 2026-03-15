import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";


export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-pattern">
      <header className="px-4 py-6 sm:px-8">
        <div className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div>
            <h1 className="font-heading text-2xl text-brand-ink">IQAC Academic Intelligence</h1>
            <p className="text-sm text-brand-ink/70">AI-Powered Monitoring and Accreditation Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="rounded-full bg-brand-sand px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-ink">
                  {user.role}
                </span>
                <span className="text-sm text-brand-ink">{user.name}</span>
              </>
            )}
            <Link to="/home" className="rounded-lg bg-brand-ink px-3 py-2 text-sm text-white">
              Home
            </Link>
            <button onClick={onLogout} className="rounded-lg bg-brand-flame px-3 py-2 text-sm text-white">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-8 pb-6">{children}</main>
    </div>
  );
}
