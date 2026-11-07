import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Search, Calendar, Award } from "lucide-react";
import { analyticsService } from "../../services/analytics.service";

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PersonalRecordsSection() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "personal-records"],
    queryFn: () => analyticsService.getPersonalRecords(),
    staleTime: 5 * 60 * 1000,
  });

  const personalRecords = data?.personalRecords || [];
  const insights = data?.insights || [];

  const filteredRecords = personalRecords.filter((pr) =>
    pr.exerciseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Personal Records</h2>
          </div>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">
            Your all-time heaviest lifts, rep personal bests, and milestone achievements
          </p>
        </div>

        {personalRecords.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search exercise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Insights Highlights */}
      {insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {insights.map((ins, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-amber-900 block mb-1">
                  {ins.title}
                </span>
                <p className="text-base font-bold text-[#111827] truncate">
                  {ins.exerciseName}
                </p>
              </div>
              <p className="text-xl font-extrabold text-amber-700 mt-2">
                {ins.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm animate-pulse"
            >
              <div className="h-5 w-36 bg-[#E5E7EB] rounded mb-4"></div>
              <div className="h-8 w-24 bg-[#E5E7EB] rounded mb-4"></div>
              <div className="h-4 w-full bg-[#E5E7EB] rounded"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 mb-2">
            Failed to load personal records.
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs font-bold text-red-700 hover:underline"
          >
            Try Again
          </button>
        </div>
      ) : personalRecords.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-8 text-center shadow-sm">
          <Award className="h-12 w-12 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#111827]">No Personal Records Yet</h3>
          <p className="text-sm text-[#6B7280] mt-1 max-w-md mx-auto">
            Complete workouts and log sets to automatically calculate your all-time PRs, e1RM milestones, and volume improvements.
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-8 text-center shadow-sm">
          <p className="text-sm text-[#6B7280]">
            No exercises match "{search}".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((pr) => (
            <div
              key={pr.exerciseName}
              className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm hover:border-cyan-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-[#111827] text-base leading-snug">
                    {pr.exerciseName}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full shrink-0">
                    {pr.totalSessions} {pr.totalSessions === 1 ? "session" : "sessions"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 pb-3 border-b border-[#F1F3F5]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-0.5">
                      Heaviest Weight
                    </span>
                    <span className="text-xl font-extrabold text-[#111827]">
                      {pr.heaviestWeight > 0 ? `${pr.heaviestWeight} kg` : "Bodyweight"}
                    </span>
                    {pr.weightImprovementPercent !== null && pr.weightImprovementPercent > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">
                        +{pr.weightImprovementPercent.toFixed(1)}% gain
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-0.5">
                      Best Reps
                    </span>
                    <span className="text-xl font-extrabold text-[#111827]">
                      {pr.bestReps} <span className="text-xs font-normal text-[#6B7280]">reps</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-1 flex items-center justify-between text-xs text-[#6B7280]">
                <span>
                  Max Vol: <strong className="text-[#111827]">{Math.round(pr.bestSessionVolume).toLocaleString()} kg</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-[#9CA3AF]" />
                  {formatRelativeDate(pr.lastPerformedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
