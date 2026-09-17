
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target, Activity, Dumbbell, CalendarCheck } from "lucide-react";
import Loader from "../components/ui/Loader";
import { getProgramAnalytics } from "../services/programAnalytics.service";

export default function ProgramAnalyticsPage() {
  const { id } = useParams();

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["programAnalytics", id],
    queryFn: () => getProgramAnalytics(id!),
    enabled: !!id,
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
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          Failed to load program analytics.
        </div>
        <Link to="/" className="mt-4 inline-block text-cyan-500 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="rounded-full bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-white">Program Analytics</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Target size={18} />
            <h3 className="font-medium text-sm">Adherence</h3>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.adherence.percentage}%</p>
          <p className="text-xs text-slate-500 mt-2">
            {analytics.adherence.completedSessions} of {analytics.adherence.scheduledDaysElapsed} scheduled days
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <CalendarCheck size={18} />
            <h3 className="font-medium text-sm">Completed Days</h3>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.adherence.completedSessions}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Activity size={18} />
            <h3 className="font-medium text-sm">Total Sets</h3>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.volume.totalCompletedSets}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Dumbbell size={18} />
            <h3 className="font-medium text-sm">Total Reps</h3>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.volume.totalReps}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-800 bg-slate-800/50 p-4">
          <h2 className="text-lg font-bold text-white">Exercise Volume</h2>
        </div>
        <div className="p-0">
          {analytics.volume.exerciseVolume.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No completed exercises yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {analytics.volume.exerciseVolume.map((trend, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="font-medium text-white">{trend.exerciseName}</div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex flex-col items-end">
                      <span className="text-slate-500">Sets</span>
                      <span className="text-white font-medium">{trend.completedSets}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-500">Reps</span>
                      <span className="text-white font-medium">{trend.totalReps}</span>
                    </div>
                    <div className="flex flex-col items-end min-w-[80px]">
                      <span className="text-slate-500">Load Vol</span>
                      <span className="text-cyan-400 font-bold">{trend.loadVolume}</span>
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

