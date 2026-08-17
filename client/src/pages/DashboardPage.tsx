import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getActiveWorkout } from "../services/workoutSession.service";
import { analyticsService } from "../services/analytics.service";
import { getExercises } from "../services/exercise.service";
import Loader from "../components/ui/Loader";
import ExerciseProgressChart from "../components/common/ExerciseProgressChart";
import { Flame, Dumbbell, Zap, Activity, Target, Search } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const { data: activeSession, isLoading: loadingActive } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
  });

  const { data: analytics, isLoading: loadingAnalytics, isError: analyticsError } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsService.getDashboardAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: exerciseList } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => getExercises({ limit: 100 }),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: exerciseProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ["analytics", "exercise", selectedExercise],
    queryFn: () => analyticsService.getExerciseProgress(selectedExercise),
    enabled: !!selectedExercise,
  });

  if (loadingActive || loadingAnalytics) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const summary = analytics?.summary;
  const recentWorkouts = analytics?.recentWorkouts || [];
  const recommendation = analytics?.progressionRecommendation;

  return (
    <div className="space-y-10">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Good {getGreetingTime()}, {user?.name}
        </h1>
        <p className="mt-2 text-slate-400">
          Your progress dashboard.
        </p>
      </div>

      {analyticsError ? (
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <p className="text-red-400">Progress data is currently unavailable. You can still start your workouts.</p>
        </div>
      ) : (
        <>
          {/* ── Your Progress ─────────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-cyan-500" size={20} />
              YOUR PROGRESS
            </h2>
            
            {summary && summary.totalWorkouts === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-lg font-medium text-white mb-2">No completed workouts yet.</p>
                <p className="text-slate-400 mb-6">Complete your first workout to start tracking your progress.</p>
                <Link
                  to="/workouts"
                  className="inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
                >
                  Start Training
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  icon={<Flame className="text-orange-500" size={24} />} 
                  label="Workout Streak" 
                  value={`${summary?.currentStreak || 0} days`} 
                />
                <StatCard 
                  icon={<Dumbbell className="text-cyan-500" size={24} />} 
                  label="Workouts" 
                  value={(summary?.totalWorkouts || 0).toString()} 
                />
                <StatCard 
                  icon={<Zap className="text-yellow-500" size={24} />} 
                  label="Total Volume" 
                  value={`${(summary?.totalVolume || 0).toLocaleString()} kg`} 
                />
                <StatCard 
                  icon={<Activity className="text-green-500" size={24} />} 
                  label="Exercises" 
                  value={(summary?.totalExercises || 0).toString()} 
                />
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Today's Workout & Progression ────────────────────────────────── */}
            <div className="space-y-6">
              <section>
                <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
                  <Target className="text-cyan-500" size={20} />
                  TODAY'S WORKOUT
                </h2>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  {activeSession ? (
                    <div>
                      <p className="text-lg font-medium text-white mb-2">
                        {typeof activeSession.workout === 'string' ? "Active Session" : activeSession.workout.name}
                      </p>
                      <p className="mb-6 text-slate-400 text-sm">
                        You have a session in progress.
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
                      <p className="text-lg font-medium text-white mb-2">Ready to train?</p>
                      <p className="mb-6 text-slate-400 text-sm">
                        Select a workout plan to begin your next session.
                      </p>
                      <Link
                        to="/workouts"
                        className="inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 w-full text-center"
                      >
                        View Workouts
                      </Link>
                    </div>
                  )}
                </div>
              </section>

              {recommendation && (
                <section>
                  <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="text-amber-500" size={20} />
                    NEXT SESSION TARGET
                  </h2>
                  <div className="rounded-2xl border border-amber-900/30 bg-gradient-to-br from-slate-900 to-amber-950/20 p-6">
                    <p className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-1">
                      {recommendation.exerciseName}
                    </p>
                    {recommendation.recommendation ? (
                      <>
                        <div className="mb-4 flex items-end gap-2">
                          <span className="text-3xl font-bold text-white">
                            {recommendation.recommendation.weight} kg
                          </span>
                          <span className="text-lg font-medium text-slate-400 mb-1">
                            {recommendation.recommendation.sets} × {recommendation.recommendation.minReps}–{recommendation.recommendation.maxReps}
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-950/50 p-4 border border-slate-800">
                          <p className="text-sm font-medium text-slate-300">
                            BodyForge Recommendation:
                          </p>
                          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                            "{recommendation.reason}"
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-400 text-sm">No recommendation available.</p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* ── Recent Workouts ──────────────────────────────────────────────── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-cyan-500" size={20} />
                  RECENT WORKOUTS
                </h2>
                <Link to="/workouts/history" className="text-sm font-medium text-cyan-500 hover:text-cyan-400">
                  View History
                </Link>
              </div>
              <div className="space-y-3">
                {recentWorkouts.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
                    <p className="text-slate-400">No recent workouts.</p>
                  </div>
                ) : (
                  recentWorkouts.map((workout) => (
                    <div key={workout.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div>
                        <p className="font-semibold text-white">{workout.workoutName}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(workout.completedAt).toLocaleDateString()} • {workout.exerciseCount} exercises
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-cyan-400">
                          {workout.totalVolume.toLocaleString()} kg
                        </p>
                        <p className="text-xs text-slate-500">Volume</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Exercise Progress ────────────────────────────────────────────── */}
          {summary && summary.totalWorkouts > 0 && (
            <section className="pt-4">
              <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
                <Search className="text-cyan-500" size={20} />
                EXERCISE PROGRESS
              </h2>
              
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-8 max-w-sm">
                  <label htmlFor="exercise-select" className="block text-sm font-medium text-slate-400 mb-2">
                    Select Exercise
                  </label>
                  <select
                    id="exercise-select"
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">-- Choose an exercise --</option>
                    {exerciseList?.exercises?.map((ex: any) => (
                      <option key={ex.id} value={ex.name}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedExercise && (
                  <div>
                    {loadingProgress ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader />
                      </div>
                    ) : exerciseProgress && exerciseProgress.sessions.length > 0 ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Best Weight</p>
                            <p className="text-2xl font-bold text-white mt-1">{exerciseProgress.bestWeight} kg</p>
                          </div>
                          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Best Reps</p>
                            <p className="text-2xl font-bold text-white mt-1">{exerciseProgress.bestReps}</p>
                          </div>
                          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Volume</p>
                            <p className="text-2xl font-bold text-cyan-400 mt-1">{exerciseProgress.totalVolume.toLocaleString()} kg</p>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-800">
                          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Weight Progression</h3>
                          <ExerciseProgressChart progress={exerciseProgress} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
                        <p className="text-slate-400">No completed sessions found for this exercise.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
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
