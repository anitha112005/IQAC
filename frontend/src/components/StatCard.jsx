export default function StatCard({ title, value, accent = "from-brand-ocean to-brand-mint" }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/60">{title}</p>
      <p className={`mt-3 bg-gradient-to-r ${accent} bg-clip-text font-heading text-3xl font-semibold text-transparent`}>
        {value}
      </p>
    </div>
  );
}
