import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit3, Eye, Play, Calendar, CheckCircle, Dumbbell } from "lucide-react";
import toast from "react-hot-toast";
import { getWorkouts, deleteWorkout } from "../../services/workout.service";
import { getActiveWorkout, startWorkout } from "../../services/workoutSession.service";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function WorkoutListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: workouts, isLoading: loadingWorkouts, isError } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeWorkout, isLoading: loadingActive } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
    staleTime: 5 * 60 * 1000,
  });

  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ["programs", "active", "today", user?.id],
    queryFn: async () => {
      const response = await api.get("/api/programs/active/today");
      return response.data.data.schedule;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete workout");
    },
  });

  const startScheduledMutation = useMutation({
    mutationFn: () => startWorkout(schedule?.workout?._id || schedule?.workout?.id, {
      programId: schedule.programId,
      programWeek: schedule.currentWeek,
      programDay: schedule.currentDay
    }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      navigate(`/workouts/session/${session.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start scheduled workout");
    },
  });

  const startRoutineMutation = useMutation({
    mutationFn: (workoutId: string) => startWorkout(workoutId),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      navigate(`/workouts/session/${session.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start workout");
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return `${Math.floor(diffHrs / 24)} days ago`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      <header className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Workouts</h1>
          <p className="text-sm font-medium text-[#6B7280]">
            Log a session or manage your routines.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-12 md:items-start">
        {/* LEFT / PRIMARY COLUMN */}
        <div className="space-y-6 md:col-span-7 lg:col-span-8">

          {/* Active Workout */}
          {loadingActive ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm animate-pulse min-h-[140px]">
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
                Started: {formatTimeAgo(activeWorkout.startedAt)}
              </p>
              <button
                onClick={() => navigate(`/workouts/session/${activeWorkout.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 hover:bg-cyan-500 min-h-[44px]"
              >
                <Play size={18} className="fill-current" />
                Resume Workout
              </button>
            </div>
          ) : null}

          {/* Today's Workout (Only show if no active workout) */}
          {(!loadingActive && !activeWorkout) && (
            <section>
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
                Today's Schedule
              </h2>
              {loadingSchedule ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm animate-pulse min-h-[140px]">
                  <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-3"></div>
                  <div className="h-6 w-48 bg-[#E5E7EB] rounded mb-4"></div>
                  <div className="h-12 w-full bg-[#E5E7EB] rounded-lg mt-auto"></div>
                </div>
              ) : !schedule?.hasActiveProgram ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
                  <Calendar className="mx-auto text-[#6B7280] mb-3" size={32} />
                  <h3 className="text-base font-bold text-[#111827] mb-2">No Active Program</h3>
                  <p className="text-sm text-[#6B7280] mb-5">
                    Start a training program to get daily workout recommendations.
                  </p>
                  <Link
                    to="/programs/builder"
                    className="inline-flex items-center justify-center w-full rounded-lg bg-[#F1F3F5] px-4 py-3 font-semibold text-[#111827] transition active:bg-[#E5E7EB] min-h-[44px]"
                  >
                    Explore Programs
                  </Link>
                </div>
              ) : schedule.isProgramFinished ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={32} />
                  <h3 className="text-base font-bold text-[#111827] mb-2">Program Complete!</h3>
                  <p className="text-sm text-[#6B7280] mb-5">
                    Congratulations! You have finished your training program.
                  </p>
                  <Link
                    to="/programs/builder"
                    className="inline-flex items-center justify-center w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 min-h-[44px]"
                  >
                    Start New Program
                  </Link>
                </div>
              ) : schedule.isCompletedToday ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">Workout Complete</h3>
                      <p className="text-xs font-medium text-[#6B7280]">
                        Week {schedule.currentWeek + 1}, Day {schedule.currentDay + 1}
                      </p>
                    </div>
                  </div>
                </div>
              ) : schedule.isRestDay ? (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-[#111827] mb-1">Rest Day</h3>
                  <p className="text-sm text-[#6B7280]">
                    Recovery day — no workout scheduled. Focus on rest and nutrition.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-[#111827]">
                      {schedule.workout?.name || "Scheduled Workout"}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#F1F3F5] text-[#6B7280] rounded">
                      W{schedule.currentWeek + 1} D{schedule.currentDay + 1}
                    </span>
                  </div>

                  {schedule.workout?.description && (
                    <p className="text-sm text-[#6B7280] mb-5 line-clamp-2 mt-1">
                      {schedule.workout.description}
                    </p>
                  )}

                  <button
                    onClick={() => startScheduledMutation.mutate()}
                    disabled={startScheduledMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 hover:bg-cyan-500 disabled:opacity-70 mt-5 min-h-[44px]"
                  >
                    <Play size={18} className="fill-current" />
                    {startScheduledMutation.isPending ? "Starting..." : "Start Workout"}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* My Workouts / Routines */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase">
                My Routines
              </h2>
            </div>

            {loadingWorkouts ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-[#FFFFFF] border border-[#E5E7EB]"></div>
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
                <p className="text-sm text-red-500 font-medium">Failed to load routines.</p>
              </div>
            ) : !workouts || workouts.length === 0 ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F3F5] mb-3">
                  <Dumbbell className="h-6 w-6 text-[#6B7280]" />
                </div>
                <h3 className="text-base font-bold text-[#111827] mb-2">No Routines Yet</h3>
                <p className="text-sm text-[#6B7280] mb-6">
                  Create your first workout routine to easily track your sessions.
                </p>
                <Link
                  to="/workouts/new"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 min-h-[44px]"
                >
                  <Plus size={18} />
                  Create Workout
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {workouts.map((workout: any) => (
                  <div
                    key={workout.id}
                    className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 transition-all hover:shadow-md"
                  >
                    <div>
                      <h3 className="text-base font-bold text-[#111827] line-clamp-1" title={workout.name}>
                        {workout.name}
                      </h3>
                      {workout.description && (
                        <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">
                          {workout.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
                        <span className="flex items-center justify-center bg-[#F1F3F5] px-2 py-0.5 rounded text-[#111827]">
                          {workout.exercises?.length || 0} exercises
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-[#E5E7EB] pt-4">
                      <button
                        onClick={() => startRoutineMutation.mutate(workout.id)}
                        disabled={startRoutineMutation.isPending}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F1F3F5] py-2 text-sm font-semibold text-[#111827] transition active:bg-[#E5E7EB] hover:bg-[#E5E7EB] min-h-[44px]"
                      >
                        Start
                      </button>
                      <Link
                        to={`/workouts/${workout.id}/edit`}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F3F5] transition"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/workouts/${workout.id}`}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F1F3F5] transition"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(workout.id)}
                        disabled={deleteMutation.isPending}
                        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT / SECONDARY COLUMN */}
        <div className="space-y-6 md:col-span-5 lg:col-span-4">

          {/* Quick Actions */}
          <section>
            <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-3">
              <Link
                to="/workouts/new"
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 text-sm font-semibold text-[#111827] hover:bg-[#F1F3F5] transition shadow-sm min-h-[44px]"
              >
                <Plus size={18} />
                Create New Routine
              </Link>
              <Link
                to="/programs/builder"
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 text-sm font-semibold text-[#111827] hover:bg-[#F1F3F5] transition shadow-sm min-h-[44px]"
              >
                <Calendar size={18} />
                Manage Programs
              </Link>
            </div>
          </section>

          {/* Program Context (if applicable) */}
          {schedule?.hasActiveProgram && (
            <section>
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
                Active Program
              </h2>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[#111827]">
                    Current Program
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-1 bg-cyan-50 text-cyan-700 rounded">
                    W{schedule.currentWeek + 1} D{schedule.currentDay + 1}
                  </span>
                </div>
                <Link
                  to={`/programs/${schedule.programId}/analytics`}
                  className="flex items-center justify-center w-full py-2.5 text-sm font-semibold text-cyan-600 bg-[#F1F3F5] hover:bg-[#E5E7EB] rounded-lg transition-colors min-h-[44px]"
                >
                  View Program
                </Link>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
