import { Link } from "react-router-dom";

export default function LandingPage() {
  const cards = [
    {
      title: "Student Risk AI",
      desc: "Predict low, medium, and high-risk students using attendance, marks, and backlog trends.",
      color: "from-[#ff7b54] to-[#ffb26b]"
    },
    {
      title: "Department Intelligence",
      desc: "Track pass percentage, average CGPA, placement rate, and research output in one place.",
      color: "from-[#00b4d8] to-[#48cae4]"
    },
    {
      title: "NAAC/NBA Readiness",
      desc: "Map evidence to accreditation criteria and monitor readiness scores with missing item alerts.",
      color: "from-[#52b788] to-[#95d5b2]"
    },
    {
      title: "Automated Reports",
      desc: "Generate student, department, placement, and faculty contribution reports in PDF/Excel.",
      color: "from-[#7b2cbf] to-[#c77dff]"
    }
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#070f1a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,123,84,0.22),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(0,180,216,0.28),transparent_35%),radial-gradient(circle_at_70%_75%,rgba(149,213,178,0.20),transparent_38%)]" />
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">AI IQAC Platform</p>
            <h1 className="font-heading text-3xl sm:text-4xl">Academic Intelligence & Accreditation Monitoring</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              One colorful command center for student progress, department outcomes, accreditation evidence, and instant reports.
            </p>
          </div>
          <Link to="/auth" className="rounded-xl bg-gradient-to-r from-[#ff7b54] to-[#ffb26b] px-5 py-3 font-semibold text-[#101828] shadow-lg shadow-[#ff7b54]/30">
            Login / Signup
          </Link>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-2">
          {cards.map((card, idx) => (
            <article
              key={card.title}
              className="landing-card rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1"
              style={{ animationDelay: `${idx * 120}ms` }}
            >
              <div className={`inline-block rounded-full bg-gradient-to-r ${card.color} px-3 py-1 text-xs font-bold uppercase tracking-wider`}>
                AI Template
              </div>
              <h2 className="mt-3 font-heading text-2xl">{card.title}</h2>
              <p className="mt-2 text-white/85">{card.desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
          <h3 className="font-heading text-2xl">Hackathon Demo Flow</h3>
          <p className="mt-2 text-white/85">
            1) Login as Faculty and upload marks/attendance. 2) Login as Admin and review analytics + risk dashboard.
            3) Generate department report in PDF or Excel.
          </p>
        </section>
      </div>
    </div>
  );
}
