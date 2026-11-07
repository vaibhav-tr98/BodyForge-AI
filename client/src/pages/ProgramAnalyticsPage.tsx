import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, Activity, Dumbbell, CalendarCheck, XCircle, Clock } from "lucide-react";
import Loader from "../components/ui/Loader";
import { getProgramAnalytics } from "../services/programAnalytics.service";

export default function ProgramAnalyticsPage() {
  const { id } = useParams();

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ["programAnalytics", id],
    queryFn: () => getProgramAnalytics(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-600 mb-3">
            Failed to load program analytics.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition"
            >
              Retry
            </button>
            <Link to="/programs" className="text-xs font-semibold text-cyan-600 hover:underline">
              Back to Programs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scheduled = analytics.adherence.scheduledDaysElapsed;
  const completed = analytics.adherence.completedSessions;
  const missed = Math.max(0, scheduled - completed);
  const percentage = scheduled > 0 ? analytics.adherence.percentage : 0;

  const getAdherenceColor = (pct: number, sched: number) => {
    if (sched === 0) return "text-[#6B7280]";
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/programs"
          className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-2 text-[#6B7280] shadow-sm transition hover:bg-[#F1F3F5] hover:text-[#111827]"
          aria-label="Back to programs"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827]">Program Analytics</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Adherence metrics, session completion rates, and cumulative exercise volume
          </p>
        </div>
      </div>

      {/* Adherence & Session Execution Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Adherence % */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-[#6B7280]">
            <Target size={18} className="text-cyan-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Adherence</h3>
          </div>
          <div>
            <p className={`text-3xl font-extrabold ${getAdherenceColor(percentage, scheduled)}`}>
              {scheduled > 0 ? `${percentage}%` : "—"}
            </p>
            <p className="text-xs text-[#6B7280] mt-1.5 font-medium">
              {scheduled > 0
                ? `${completed} of ${scheduled} scheduled days completed`
                : "No elapsed scheduled days yet"}
            </p>
          </div>
        </div>

        {/* Scheduled Days */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-[#6B7280]">
            <Clock size={18} className="text-indigo-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Scheduled</h3>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#111827]">{scheduled}</p>
            <p className="text-xs text-[#6B7280] mt-1.5 font-medium">
              Elapsed planned workout days
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-[#6B7280]">
            <CalendarCheck size={18} className="text-emerald-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Completed</h3>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-600">{completed}</p>
            <p className="text-xs text-[#6B7280] mt-1.5 font-medium">
              Sessions logged and verified
            </p>
          </div>
        </div>

        {/* Missed Sessions */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-[#6B7280]">
            <XCircle size={18} className={missed > 0 ? "text-rose-500" : "text-[#9CA3AF]"} />
            <h3 className="font-bold text-xs uppercase tracking-wider">Missed</h3>
          </div>
          <div>
            <p className={`text-3xl font-extrabold ${missed > 0 ? "text-rose-600" : "text-[#111827]"}`}>
              {missed}
            </p>
            <p className="text-xs text-[#6B7280] mt-1.5 font-medium">
              {missed === 0 && scheduled > 0 ? "Flawless streak! Zero missed days" : "Elapsed days without completed log"}
            </p>
          </div>
        </div>
      </div>

      {/* Program Volume Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-[#6B7280]">
              <Activity size={18} className="text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Total Completed Sets</h3>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{analytics.volume.totalCompletedSets}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-[#6B7280]">
              <Dumbbell size={18} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Total Reps Completed</h3>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{analytics.volume.totalReps.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Exercise Volume Breakdown */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] shadow-sm overflow-hidden">
        <div className="border-b border-[#E5E7EB] bg-[#F7F8FA] px-6 py-4">
          <h2 className="text-base font-bold text-[#111827]">Cumulative Exercise Volume</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Total working sets, repetitions, and load volume lifted for each exercise in this program
          </p>
        </div>

        <div>
          {analytics.volume.exerciseVolume.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280] font-medium text-sm">
              No completed exercises logged yet for this program. Complete your first workout to generate volume analytics!
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {analytics.volume.exerciseVolume.map((trend, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 gap-3 hover:bg-[#F7F8FA]/50 transition-colors"
                >
                  <div className="font-bold text-[#111827] text-base">{trend.exerciseName}</div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Sets</span>
                      <span className="text-[#111827] font-semibold">{trend.completedSets}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Reps</span>
                      <span className="text-[#111827] font-semibold">{trend.totalReps}</span>
                    </div>
                    <div className="flex flex-col items-end min-w-[90px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Load Vol</span>
                      <span className="text-cyan-700 font-extrabold">{Math.round(trend.loadVolume).toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
