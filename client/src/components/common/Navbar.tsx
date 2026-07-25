import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          to="/"
          className="text-2xl font-bold text-cyan-400"
        >
          BodyForge AI
        </Link>

        <div className="flex items-center gap-8">
          <Link
            to="/login"
            className="text-slate-300 transition hover:text-cyan-400"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}