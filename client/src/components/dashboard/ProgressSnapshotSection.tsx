import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getProgressSummary } from "../../services/progress.service";

export default function ProgressSnapshotSection() {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["progress", "summary"],
    queryFn: getProgressSummary,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold text-white">Progress Snapshot</h2>
        <div className="mt-6 flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold text-white">Progress Snapshot</h2>
        <div className="mt-4 text-sm text-red-400">Failed to load progress data.</div>
      </div>
    );
  }

  const hasHistory = summary && summary.totalEntries > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-500" />
          Progress
        </h2>
        {hasHistory && (
          <Link to="/progress" className="text-sm font-medium text-cyan-500 hover:text-cyan-400">
            View Details
          </Link>
        )}
      </div>

      <div className="mt-6">
        {hasHistory ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current</p>
              <p className="mt-1 text-2xl font-bold text-white">{summary.currentWeight} <span className="text-sm text-slate-500">kg</span></p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Change</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {summary.weightChange! > 0 ? '+' : ''}{summary.weightChange} <span className="text-sm text-slate-500">kg</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trend</p>
              <div className="mt-1 flex items-center gap-1.5">
                {summary.trend === "losing" ? (
                  <TrendingDown className="h-5 w-5 text-emerald-500" />
                ) : summary.trend === "gaining" ? (
                  <TrendingUp className="h-5 w-5 text-rose-500" />
                ) : (
                  <Minus className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-lg font-bold text-white capitalize">{summary.trend}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-4">No progress history yet.</p>
            <Link 
              to="/progress" 
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
            >
              Track Progress
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
