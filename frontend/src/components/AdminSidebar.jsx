export default function AdminSidebar({ active = "overview", onNavigate }) {
  const navItems = [
    { key: "overview", label: "Overview" },
    { key: "add-department", label: "Add Department" },
    { key: "add-faculty", label: "Add Faculty" },
    { key: "accreditation-report", label: "Accreditation Report" },
    { key: "department-compare", label: "Department Compare" },
    { key: "institutional-analysis", label: "Institutional Analysis" }
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white/90 backdrop-blur border-r border-white/40 shadow-lg z-10 flex flex-col">
      <div className="p-6">
        <h2 className="font-heading text-xl text-brand-ink mb-8">IQAC Admin Dashboard</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active === item.key
                  ? "bg-brand-ink text-white"
                  : "text-brand-ink hover:bg-brand-ink/10"
              }`}
            >
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
