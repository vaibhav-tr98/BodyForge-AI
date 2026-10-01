import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Calendar, CheckCircle, ChevronLeft, ChevronRight, Activity, Dumbbell, AlertTriangle, Play } from "lucide-react";
import { getWorkoutSessions } from "../../services/workoutSession.service";

// Format duration into readable string (e.g. 45 min, 1h 20m, 3d 4h)
function formatDuration(startedAt: string, completedAt?: string) {
  if (!completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) return `${hours}h ${remainingMins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

// Format date nicely (e.g. Today, Yesterday, Sep 12)
function formatFriendlyDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay.getTime() === today.getTime()) return "Today";
  if (dDay.getTime() === yesterday.getTime()) return "Yesterday";

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return new Intl.DateTimeFormat(undefined, options).format(d);
}

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(dateStr));
}

export default function WorkoutHistoryPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["workoutSessions", { page }],
    queryFn: () => getWorkoutSessions(page, limit),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const sessions = data?.sessions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // React #310 Safety: Loading & Error states happen AFTER all hooks.
  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">

      {/* Header */}
      <header className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] uppercase tracking-wide">Workout History</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-1">
            Your completed training sessions
          </p>
        </div>
      </header>

      {/* Summary Area */}
      {!isLoading && !isError && total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-cyan-600" />
                <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Workouts</h3>
              </div>
              <p className="text-2xl font-bold text-[#111827]">{total}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 shadow-sm animate-pulse min-h-[140px]">
              <div className="h-6 w-48 bg-[#F1F3F5] rounded mb-4"></div>
              <div className="h-4 w-32 bg-[#F1F3F5] rounded mb-2"></div>
              <div className="h-4 w-64 bg-[#F1F3F5] rounded"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-base font-bold text-[#111827] mb-2">Unable to load workout history</h3>
          <p className="text-sm text-[#6B7280] mb-5">
            There was a problem retrieving your past sessions.
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] px-4 py-2 font-semibold text-[#111827] transition hover:bg-[#F1F3F5] shadow-sm min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F3F5] mb-4">
            <Dumbbell className="h-8 w-8 text-[#6B7280]" />
          </div>
          <h3 className="text-lg font-bold text-[#111827] mb-2 uppercase tracking-wide">No Workout History Yet</h3>
          <p className="text-sm text-[#6B7280] mb-8 max-w-sm mx-auto">
            Complete your first workout and your training history will appear here.
          </p>
          <Link
            to="/workouts"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 min-h-[44px]"
          >
            <Play size={18} className="fill-current" />
            Go to Workouts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {sessions.map((session: any) => {
              const workoutName = typeof session.workout === 'object' && session.workout ? session.workout.name : "Unknown Workout";
              const isDeleted = workoutName === "Deleted Workout";
              const isCompleted = session.status === "completed";

              const volume = session.exercises?.reduce((total: number, ex: any) =>
                total + (ex.sets?.filter((s: any) => s.completed)?.reduce((sum: number, s: any) => sum + (s.weight || 0) * s.reps, 0) || 0)
              , 0) || 0;

              const totalCompletedSets = session.exercises?.reduce((total: number, ex: any) =>
                total + (ex.sets?.filter((s: any) => s.completed)?.length || 0)
              , 0) || 0;

              return (
                <Link
                  key={session.id}
                  to={`/workouts/session/${session.id}/detail`}
                  className={`group flex flex-col sm:flex-row justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm transition hover:border-cyan-500 hover:shadow-md ${isFetching ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-bold truncate ${isDeleted ? 'text-[#6B7280] italic' : 'text-[#111827] group-hover:text-cyan-600 transition-colors'}`}>
                        {workoutName}
                      </h3>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      {isDeleted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#F1F3F5] text-[#6B7280] rounded uppercase tracking-wider">
                          Deleted
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6B7280] font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{formatFriendlyDate(session.startedAt)} &middot; {formatTime(session.startedAt)}</span>
                      </div>

                      {session.completedAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(session.startedAt, session.completedAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center justify-center bg-[#F1F3F5] px-2.5 py-1 rounded text-xs font-bold text-[#111827]">
                        {totalCompletedSets} sets
                      </span>
                      {volume > 0 && (
                        <span className="inline-flex items-center justify-center bg-[#F1F3F5] px-2.5 py-1 rounded text-xs font-bold text-[#111827]">
                          {volume.toLocaleString()} kg vol
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-0 sm:self-center flex items-center">
                    <span className="text-sm font-semibold text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex items-center gap-1">
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </span>
                    {/* Mobile visible action */}
                    <span className="sm:hidden w-full flex items-center justify-center gap-1 rounded-lg bg-[#F1F3F5] py-2.5 text-sm font-semibold text-[#111827] min-h-[44px]">
                      View Details
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-6 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="flex items-center justify-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-[#F1F3F5] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="text-sm font-medium text-[#6B7280]">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isFetching}
                className="flex items-center justify-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-[#F1F3F5] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
