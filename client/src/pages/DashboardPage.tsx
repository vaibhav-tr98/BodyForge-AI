import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* ── Welcome header ───────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white" id="dashboard-heading">
          Welcome back, {user?.name}
        </h1>
        <p className="mt-2 text-slate-400">
          Your fitness journey continues here.
        </p>
      </div>

      {/* ── Quick stats ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Height" value={user?.height ? `${user.height} cm` : "—"} />
        <StatCard label="Weight" value={user?.weight ? `${user.weight} kg` : "—"} />
        <StatCard label="Goal" value={user?.goal ?? "—"} />
        <StatCard label="Experience" value={user?.experience ?? "—"} />
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        {(!user?.height || !user?.weight || !user?.goal) && (
          <Link
            to="/onboarding"
            id="onboarding-link"
            className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
          >
            Complete Onboarding
          </Link>
        )}

        <Link
          to="/workouts"
          id="workouts-link"
          className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
        >
          My Workouts
        </Link>

        <Link
          to="/profile"
          id="profile-link"
          className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-400"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
