import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getActiveWorkout } from "../services/workoutSession.service";
import { analyticsService } from "../services/analytics.service";
import { Link, useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import TodayScheduleSection from "../components/dashboard/TodayScheduleSection";
import { BodyForgeCoachSection } from "../components/dashboard/BodyForgeCoachSection";
import TrainingReadinessSection from "../components/dashboard/TrainingReadinessSection";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Existing Queries
  const { data: activeWorkout, isLoading: loadingActive } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
    staleTime: 5 * 60 * 1000,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsService.getDashboardAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  const summary = analytics?.summary;
  const recentWorkouts = analytics?.recentWorkouts || [];

  const today = new Date();
  const dateFormatted = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(today);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Greeting */}
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-[#111827]">
          Good {getGreetingTime()}, {user?.name?.split(" ")[0] || "Athlete"}
        </h1>
        <p className="text-sm font-medium text-[#6B7280]">{dateFormatted}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-12 md:items-start">
        {/* LEFT / MAIN COLUMN (Desktop) */}
        <div className="space-y-6 md:col-span-7 lg:col-span-8">

          {/* Active Workout Priority OR Today's Workout */}
          {loadingActive ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm min-h-[140px] animate-pulse">
              <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-3"></div>
              <div className="h-6 w-48 bg-[#E5E7EB] rounded mb-4"></div>
              <div className="h-12 w-full bg-[#E5E7EB] rounded-lg mt-auto"></div>
            </div>
          ) : activeWorkout ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
              <h2 className="text-xs font-bold tracking-wider text-cyan-600 uppercase mb-1">
                Workout in Progress
              </h2>
              <h3 className="text-lg font-bold text-[#111827] mb-1">
                {typeof activeWorkout.workout === 'object' && activeWorkout.workout ? activeWorkout.workout.name : "Active Session"}
              </h3>
              <p className="text-sm text-[#6B7280] mb-5">
                Started: {formatTimeAgo(new Date(activeWorkout.startedAt))}
              </p>
              <button
                onClick={() => navigate(`/workouts/session/${activeWorkout.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 hover:bg-cyan-500"
              >
                <Play size={18} className="fill-current" />
                Resume Workout
              </button>
            </div>
          ) : (
            <TodayScheduleSection />
          )}

          {/* Recent Activity */}
          <section>
            <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
              Recent Activity
            </h2>
            {loadingAnalytics ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB]"></div>
                ))}
              </div>
            ) : recentWorkouts.length > 0 ? (
              <div className="space-y-3">
                {recentWorkouts.slice(0, 3).map((rw) => (
                  <div key={rw.id} className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="font-semibold text-[#111827]">{rw.workoutName || "Workout"}</h4>
                      <p className="text-xs text-[#6B7280] mt-1">{formatDateRelative(new Date(rw.completedAt))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#111827]">{rw.exerciseCount} exercises</p>
                      <p className="text-xs text-[#6B7280] mt-1">{Math.round(rw.totalVolume).toLocaleString()} kg vol</p>
                    </div>
                  </div>
                ))}
                <Link
                  to="/workouts/history"
                  className="block w-full text-center py-3 text-sm font-semibold text-cyan-600 hover:bg-[#F1F3F5] rounded-lg transition-colors"
                >
                  View History
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center text-sm text-[#6B7280]">
                No recent workouts found.
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (Desktop) */}
        <div className="space-y-6 md:col-span-5 lg:col-span-4">

          {/* Quick Stats */}
          <section>
            <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
              Quick Stats
            </h2>
            {loadingAnalytics ? (
              <div className="grid grid-cols-2 gap-3 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB]"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
                  <p className="text-xs text-[#6B7280] font-medium mb-1">Workouts</p>
                  <p className="text-2xl font-bold text-[#111827]">{summary?.totalWorkouts || 0}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
                  <p className="text-xs text-[#6B7280] font-medium mb-1">Weekly Vol</p>
                  <p className="text-2xl font-bold text-[#111827]">
                    {summary?.totalVolume ? `${(summary.totalVolume / 1000).toFixed(1)}k` : "0"} kg
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
                  <p className="text-xs text-[#6B7280] font-medium mb-1">Sets</p>
                  <p className="text-2xl font-bold text-[#111827]">{summary?.totalExercises || 0}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
                  <p className="text-xs text-[#6B7280] font-medium mb-1">Day Streak</p>
                  <p className="text-2xl font-bold text-[#111827]">{summary?.currentStreak || 0}</p>
                </div>
              </div>
            )}
          </section>

          {/* Readiness */}
          <TrainingReadinessSection />

          {/* Coach */}
          <BodyForgeCoachSection />

          {/* Quick Links for Removed Dashboard Features */}
          <section>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/progress"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm hover:bg-[#F1F3F5] transition-colors"
              >
                <span className="text-sm font-semibold text-[#111827]">View Progress</span>
                <span className="text-xs text-[#6B7280] mt-1">PRs & Metrics</span>
              </Link>
              <Link
                to="/nutrition"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm hover:bg-[#F1F3F5] transition-colors"
              >
                <span className="text-sm font-semibold text-[#111827]">Nutrition</span>
                <span className="text-xs text-[#6B7280] mt-1">Macros & Diet</span>
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function getGreetingTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  return `${Math.floor(diffHrs / 24)} days ago`;
}

function formatDateRelative(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
