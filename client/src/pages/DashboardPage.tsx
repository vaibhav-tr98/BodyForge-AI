import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getActiveWorkout } from "../services/workoutSession.service";
import { analyticsService } from "../services/analytics.service";
import { getExercises } from "../services/exercise.service";
import Loader from "../components/ui/Loader";
import ExerciseProgressChart from "../components/common/ExerciseProgressChart";
import { BodyForgeCoachSection } from "../components/dashboard/BodyForgeCoachSection";
import TrainingReadinessSection from "../components/dashboard/TrainingReadinessSection";
import NutritionTodaySection from "../components/dashboard/NutritionTodaySection";
import ProgressSnapshotSection from "../components/dashboard/ProgressSnapshotSection";
import TodayScheduleSection from "../components/dashboard/TodayScheduleSection";
import { Dumbbell, Activity, Trophy, LineChart, Target, Calendar } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const { data: activeWorkout, isLoading: loadingActive } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
    staleTime: 5 * 60 * 1000,
  });

  const { data: analytics, isLoading: loadingAnalytics, isError: analyticsError } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => analyticsService.getDashboardAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: prData, isLoading: isLoadingPRs } = useQuery({
    queryKey: ["analytics", "personal-records"],
    queryFn: () => analyticsService.getPersonalRecords(),
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });

  if (loadingAnalytics || loadingActive) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const summary = analytics?.summary;

  return (
    <div className="space-y-12 pb-12">
      <header className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Good {getGreetingTime()}, {user?.name}
        </h1>
        <p className="mt-2 text-slate-400">
          Your intelligent training dashboard.
        </p>
      </header>

      {analyticsError ? (
        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <p className="text-red-400">Dashboard data is currently unavailable. You can still access other features.</p>
        </div>
      ) : (
        <>
          {/* 1. Today's Schedule */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-cyan-400" size={24} />
              TODAY'S SCHEDULE
            </h2>
            <TodayScheduleSection />
          </section>

          {/* 1.1 Active Workout Info */}
          {activeWorkout && (
            <section className="space-y-4 pt-6 border-t border-slate-800/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="text-cyan-500" size={24} />
                ACTIVE WORKOUT
              </h2>
              <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {typeof activeWorkout.workout === 'object' ? activeWorkout.workout.name : "Workout Session"}
                    </h3>
                    <p className="text-sm text-cyan-200/80 mt-1">
                      {activeWorkout.exercises.length} exercises planned
                    </p>
                  </div>
                  <Link
                    to={`/workouts/session/${activeWorkout.id}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:bg-cyan-700 active:scale-95"
                  >
                    Resume Workout
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* 2. Unified AI Coach */}
          <section className="space-y-6 pt-6 border-t border-slate-800/50">
            <BodyForgeCoachSection />
          </section>

          {/* 3. Training & Readiness */}
          <section className={`space-y-6 pt-6 border-t border-slate-800/50`}>
            <TrainingReadinessSection />
          </section>

          {/* 4. Nutrition & Fuel */}
          <section className="space-y-6 pt-6 border-t border-slate-800/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="text-amber-400" size={24} />
              NUTRITION & FUEL
            </h2>
            <NutritionTodaySection />
          </section>

          {/* 5. Body & Metrics Progress */}
          <section className="space-y-6 pt-6 border-t border-slate-800/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <LineChart className="text-cyan-400" size={24} />
              BODY & METRICS PROGRESS
            </h2>
            <ProgressSnapshotSection />
          </section>

          {/* 5. Performance Tracking */}
          <section className="space-y-6 pt-6 border-t border-slate-800/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-400" size={24} />
              PERFORMANCE TRACKING
            </h2>
            
            {summary && summary.totalWorkouts === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-lg font-medium text-white mb-2">No completed workouts yet.</p>
                <p className="text-slate-400 mb-6">Complete your first workout to start tracking your performance.</p>
                <Link
                  to="/workouts"
                  className="inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
                >
                  Start Training
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
                  <h3 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={16} />
                    Recent Personal Records
                  </h3>
                  
                  {isLoadingPRs ? (
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <div>
                            <div className="h-4 w-32 bg-slate-800 rounded mb-1"></div>
                            <div className="h-3 w-20 bg-slate-800 rounded"></div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div className="h-4 w-12 bg-slate-800 rounded mb-1"></div>
                            <div className="h-3 w-8 bg-slate-800 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : prData && prData.personalRecords && prData.personalRecords.length > 0 ? (
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                      {prData.personalRecords.slice(0, 5).map((pr: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-950 border border-slate-800">
                          <div>
                            <p className="font-medium text-white">{pr.exerciseName}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {(() => {
                                if (!pr.lastPerformedAt) return "Date unavailable";
                                const d = new Date(pr.lastPerformedAt);
                                return isNaN(d.getTime()) ? "Date unavailable" : d.toLocaleDateString();
                              })()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-cyan-400">{pr.heaviestWeight} kg</p>
                            <p className="text-xs text-slate-400">{pr.bestReps} reps</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center flex flex-col items-center justify-center min-h-[160px]">
                      <p className="text-lg font-medium text-white mb-2">No personal records yet.</p>
                      <p className="text-slate-400">Complete a workout to start setting records.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="mb-6">
                    <label htmlFor="exercise-select" className="block text-sm font-medium text-slate-400 mb-2">
                      Analyze Specific Exercise
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
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                              <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1"><Dumbbell size={12}/> Best Weight</p>
                              <p className="text-2xl font-bold text-white mt-1">
                                {exerciseProgress.bestWeight > 0 ? `${exerciseProgress.bestWeight} kg` : "-"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                              <p className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Best Reps</p>
                              <p className="text-2xl font-bold text-white mt-1">{exerciseProgress.bestReps}</p>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-slate-800">
                            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Progression</h3>
                            <div className="h-48">
                              <ExerciseProgressChart progress={exerciseProgress} />
                            </div>
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
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function getGreetingTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

