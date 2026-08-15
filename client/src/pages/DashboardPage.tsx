import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getActiveWorkout } from "../services/workoutSession.service";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: activeSession } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
  });

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

      {/* ── Today's Workout ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold text-white mb-4">TODAY'S WORKOUT</h2>
        {activeSession ? (
          <div>
            <p className="mb-4 text-slate-400">
              You have an active session in progress.
            </p>
            <Link
              to={`/workouts/session/${activeSession.id}`}
              className="inline-block rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-700"
            >
              Resume Workout
            </Link>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-slate-400">
              No active workout. Ready to train?
            </p>
            <Link
              to="/workouts"
              className="inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
            >
              View Workouts
            </Link>
          </div>
        )}
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
