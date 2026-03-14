import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-pattern grid place-items-center px-4">
      <div className="rounded-2xl border border-white/50 bg-white/80 p-8 text-center">
        <h1 className="font-heading text-4xl text-brand-ink">404</h1>
        <p className="mt-2 text-brand-ink/70">Page not found</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-brand-ink px-4 py-2 text-white">
          Go Home
        </Link>
      </div>
    </div>
  );
}
