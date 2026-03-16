import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

const roleLabel = {
  admin: "Admin",
  hod: "Department",
  department: "Department",
  student: "Student",
  faculty: "Faculty"
};

const dashboardLinks = [
  { to: "/admin", label: "Admin Dashboard", allowed: ["admin"] },
  { to: "/hod", label: "Department Dashboard", allowed: ["hod"] },
  { to: "/faculty", label: "Faculty Panel", allowed: ["faculty", "hod"] },
  { to: "/student", label: "Student Dashboard", allowed: ["student"] }
];

const rotatingPhrases = [
  "Department Analytics",
  "Faculty Performance Intelligence",
  "Student Risk Prediction",
  "Accreditation Monitoring"
];

const featureCards = [
  {
    title: "Student Risk Analysis",
    subtitle: "Predict at-risk learners with attendance, backlog, and performance vectors.",
    icon: "SR"
  },
  {
    title: "Faculty Performance Tracking",
    subtitle: "Measure contribution, mentoring impact, and teaching outcomes in real time.",
    icon: "FP"
  },
  {
    title: "Department Intelligence",
    subtitle: "Track semester KPIs, section drift, and comparative growth across departments.",
    icon: "DI"
  },
  {
    title: "Accreditation Monitoring",
    subtitle: "Convert compliance data into actionable readiness signals and evidence trails.",
    icon: "AM"
  }
];

function NeuralNetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let animationId = 0;

    const particleCount = 72;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: 1.2 + Math.random() * 2.6
    }));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      particles.forEach((p) => {
        if (!p.x || !p.y) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= width) p.vx *= -1;
        if (p.y <= 0 || p.y >= height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(132, 145, 255, 0.85)";
        ctx.shadowColor = "rgba(105, 191, 255, 0.8)";
        ctx.shadowBlur = 14;
        ctx.fill();
      });

      ctx.shadowBlur = 0;

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const alpha = (1 - distance / 150) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(123, 155, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}

function RippleButton({ children, to, onClick, className }) {
  const [ripples, setRipples] = useState([]);
  const navigate = useNavigate();

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y, size }]);

    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);

    if (onClick) onClick();
    if (to) navigate(to);
  };

  return (
    <button onClick={handleClick} className={`relative overflow-hidden ${className}`}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="homepage-ripple"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
        />
      ))}
    </button>
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const normalizedRole = String(user?.role || "").toLowerCase() === "department" ? "hod" : String(user?.role || "").toLowerCase();
  const visibleLinks = dashboardLinks.filter((link) => link.allowed.includes(normalizedRole));
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  const primaryLink = visibleLinks[0]?.to || "/home";
  const analyticsLink = visibleLinks.find((x) => x.to !== primaryLink)?.to || primaryLink;

  useEffect(() => {
    const fullText = rotatingPhrases[phraseIndex];
    const interval = window.setTimeout(
      () => {
        if (!isDeleting && typedText.length < fullText.length) {
          setTypedText(fullText.slice(0, typedText.length + 1));
          return;
        }

        if (!isDeleting && typedText.length === fullText.length) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && typedText.length > 0) {
          setTypedText(fullText.slice(0, typedText.length - 1));
          return;
        }

        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length);
      },
      isDeleting ? 45 : 80
    );

    return () => window.clearTimeout(interval);
  }, [typedText, phraseIndex, isDeleting]);

  const navLinks = useMemo(
    () => [
      { label: "Home", to: "/home" },
      { label: "Admin Dashboard", to: "/admin", hidden: normalizedRole !== "admin" },
      { label: "Faculty Panel", to: "/faculty", hidden: !(normalizedRole === "faculty" || normalizedRole === "hod") }
    ].filter((x) => !x.hidden),
    [normalizedRole]
  );

  const onHeroMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width;
    const offsetY = (event.clientY - rect.top) / rect.height;
    setHeroTilt({ x: (offsetY - 0.5) * -10, y: (offsetX - 0.5) * 10 });
  };

  const onHeroLeave = () => setHeroTilt({ x: 0, y: 0 });

  const onLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#040712] via-[#071326] to-[#120a28] text-white">
      <NeuralNetworkBackground />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_20%,rgba(78,115,255,0.22),transparent_30%),radial-gradient(circle_at_78%_0%,rgba(171,77,255,0.23),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(52,220,255,0.12),transparent_30%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1220px] px-5 pb-16 pt-8 sm:px-8">
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 shadow-[0_0_36px_rgba(96,144,255,0.2)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6da1ff] to-[#a955ff] font-semibold text-white shadow-[0_0_26px_rgba(130,130,255,0.7)]">IQ</div>
            <div>
              <p className="text-lg font-semibold tracking-wide">IQAC Academic Intelligence</p>
              <p className="text-xs text-blue-100/70">AI-Powered Monitoring and Accreditation Dashboard</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-transparent px-3 py-2 text-sm text-blue-100/85 transition-all duration-300 hover:border-blue-300/40 hover:bg-blue-400/10 hover:text-white hover:shadow-[0_0_18px_rgba(95,146,255,0.45)]"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="rounded-xl bg-gradient-to-r from-[#5f8cff] to-[#a855f7] px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(132,99,255,0.6)] transition hover:scale-[1.03]"
            >
              Logout
            </button>
          </div>
        </motion.nav>

        <section className="grid min-h-[72vh] gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-blue-100/80">Future Ready University Intelligence</p>
            <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              AI-Powered Academic Intelligence
            </h1>

            <div className="mt-4 min-h-9 text-lg text-cyan-200 sm:text-xl">
              <span className="font-medium">{typedText}</span>
              <span className="ml-1 inline-block h-6 w-[2px] animate-pulse bg-cyan-200 align-middle" />
            </div>

            <p className="mt-5 max-w-xl text-base text-blue-50/80 sm:text-lg">
              Transform your university data into intelligent academic insights.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <RippleButton
                to={primaryLink}
                className="rounded-xl bg-gradient-to-r from-[#5f8cff] to-[#a855f7] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(126,111,255,0.65)] transition hover:scale-[1.04]"
              >
                Explore Dashboard
              </RippleButton>
              <RippleButton
                to={analyticsLink}
                className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_22px_rgba(77,176,255,0.3)] transition hover:scale-[1.04]"
              >
                View Analytics
              </RippleButton>
            </div>
          </motion.div>

          <motion.div
            onMouseMove={onHeroMove}
            onMouseLeave={onHeroLeave}
            animate={{ rotateX: heroTilt.x, rotateY: heroTilt.y, y: [0, -10, 0] }}
            transition={{ rotateX: { duration: 0.2 }, rotateY: { duration: 0.2 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
            className="relative rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_0_45px_rgba(74,130,255,0.28)] backdrop-blur-xl"
            style={{ transformStyle: "preserve-3d" }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">Live AI Dashboard Preview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-200/20 bg-[#0f1b36]/70 p-3">
                <p className="text-xs text-blue-100/70">Student Performance</p>
                <div className="mt-2 flex h-20 items-end gap-1">
                  {[38, 52, 44, 63, 78, 71, 86].map((h, i) => (
                    <motion.div key={i} initial={{ height: 10 }} animate={{ height: h }} transition={{ duration: 0.8, delay: i * 0.06 }} className="w-4 rounded-t bg-gradient-to-t from-cyan-400 to-blue-500" />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-purple-200/20 bg-[#1a1138]/70 p-3">
                <p className="text-xs text-purple-100/70">Department Ranking</p>
                <div className="mt-2 space-y-2 text-xs">
                  {["CSE", "ECE", "MECH"].map((d, idx) => (
                    <div key={d} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
                      <span>{d}</span>
                      <span className="text-cyan-200">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-white/15 bg-[#101b39]/70 p-3">
                <p className="text-xs text-blue-100/70">Faculty Performance Graph</p>
                <svg viewBox="0 0 320 90" className="mt-2 w-full">
                  <defs>
                    <linearGradient id="facultyGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#5f8cff" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <polyline fill="none" stroke="url(#facultyGlow)" strokeWidth="3" points="0,74 40,56 80,60 120,42 160,44 200,29 240,35 280,22 320,25" />
                </svg>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_0_30px_rgba(120,140,255,0.22)] backdrop-blur-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-blue-100/70">Welcome Panel</p>
              <h3 className="mt-2 text-2xl font-semibold">Welcome, {user?.name || "University Admin"}</h3>
              <p className="mt-1 text-sm text-blue-50/75">Logged in as {roleLabel[normalizedRole] || normalizedRole}. AI monitoring is actively tracking your academic health signals.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100/85">
              <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1">Model Sync</span>
              <span className="rounded-full border border-violet-300/40 bg-violet-300/10 px-3 py-1">Risk Engine</span>
              <span className="rounded-full border border-blue-300/40 bg-blue-300/10 px-3 py-1">Compliance AI</span>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card, idx) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: idx * 0.08 }}
              whileHover={{ y: -8, rotateX: 7, rotateY: -6, scale: 1.02 }}
              className="group rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_0_24px_rgba(93,134,255,0.2)] backdrop-blur-xl"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5f8cff] to-[#a855f7] text-xs font-semibold text-white shadow-[0_0_20px_rgba(120,120,255,0.55)]">
                {card.icon}
              </div>
              <h4 className="text-lg font-semibold">{card.title}</h4>
              <p className="mt-2 text-sm text-blue-100/75">{card.subtitle}</p>
              <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-cyan-300/50 to-transparent opacity-70 transition group-hover:opacity-100" />
            </motion.article>
          ))}
        </section>
      </div>

      <style>{`
        .homepage-ripple {
          position: absolute;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.35);
          transform: scale(0);
          animation: homepage-ripple 650ms ease-out;
          pointer-events: none;
        }

        @keyframes homepage-ripple {
          to {
            transform: scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
