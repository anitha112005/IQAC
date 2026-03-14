import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const getNavigationItems = () => {
    const baseItems = [
      { path: "/home", label: "Home", icon: "🏠" }
    ];

    switch (user?.role) {
      case "admin":
        return [
          ...baseItems,
          { path: "/admin", label: "Admin Dashboard", icon: "📊" }
        ];
      case "hod":
        return [
          ...baseItems,
          { path: "/hod", label: "HOD Dashboard", icon: "👔" },
          { path: "/faculty", label: "Faculty Dashboard", icon: "👨‍🏫" }
        ];
      case "faculty":
        return [
          ...baseItems,
          { path: "/faculty", label: "Faculty Dashboard", icon: "👨‍🏫" }
        ];
      case "student":
        return [
          ...baseItems,
          { path: "/student", label: "Student Dashboard", icon: "🎓" }
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white/90 backdrop-blur border-r border-white/40 shadow-lg z-10">
      <div className="p-6">
        <h2 className="font-heading text-xl text-brand-ink mb-8">Navigation</h2>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? "bg-brand-ink text-white"
                  : "text-brand-ink hover:bg-brand-ink/10"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* User info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-sand flex items-center justify-center">
            <span className="text-brand-ink font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-brand-ink">{user?.name}</p>
            <p className="text-xs text-brand-ink/70 uppercase">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}