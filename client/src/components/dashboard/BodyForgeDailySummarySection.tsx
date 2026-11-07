import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRightCircle, RefreshCw } from "lucide-react";
import { useDailySummary } from "../../hooks/useDailySummary";

interface BodyForgeDailySummarySectionProps {
  date?: Date;
}

export const BodyForgeDailySummarySection: React.FC<BodyForgeDailySummarySectionProps> = ({ date = new Date() }) => {
  const dateString = date.toISOString().split("T")[0];
  const { data, isLoading, isError, refetch } = useDailySummary(dateString);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-600" />
          <div className="h-5 bg-[#E5E7EB] rounded w-48"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-[#E5E7EB] rounded w-3/4"></div>
          <div className="h-4 bg-[#E5E7EB] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            <h3 className="text-base font-bold text-[#111827]">Daily AI Briefing</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
        <p className="text-sm text-[#6B7280]">
          Daily AI briefing is momentarily unavailable. Continue logging your activities to receive fresh insights.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-600" />
        <h3 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
          Daily AI Briefing
        </h3>
      </div>

      <div className="space-y-5 text-sm text-[#374151]">
        <div>
          <p className="leading-relaxed text-sm sm:text-base text-[#111827] font-medium">
            {data.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <h4 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Top Highlight</span>
            </h4>
            <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-normal">
              {data.topPositive}
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <h4 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Needs Focus</span>
            </h4>
            <p className="text-xs sm:text-sm text-amber-950 font-medium leading-normal">
              {data.mainAttention}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
          <h4 className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5">
            <ArrowRightCircle className="w-4 h-4 text-cyan-600" />
            <span>Recommended Next Action</span>
          </h4>
          <p className="text-xs sm:text-sm text-cyan-950 font-semibold leading-normal">
            {data.nextAction}
          </p>
        </div>
      </div>
    </div>
  );
};
