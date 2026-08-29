import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRightCircle } from "lucide-react";
import { useDailySummary } from "../../hooks/useDailySummary";

interface BodyForgeDailySummarySectionProps {
  date?: Date;
}

export const BodyForgeDailySummarySection: React.FC<BodyForgeDailySummarySectionProps> = ({ date = new Date() }) => {
  const dateString = date.toISOString().split("T")[0];
  const { data, isLoading, isError } = useDailySummary(dateString);

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 animate-pulse">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">BODYFORGE DAILY SUMMARY</h3>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white tracking-wide">BODYFORGE DAILY SUMMARY</h3>
        </div>
        <p className="text-slate-400 text-sm">AI analysis is temporarily unavailable.</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-cyan-700/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-cyan-400" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-cyan-50 tracking-wide">BODYFORGE DAILY SUMMARY</h3>
        </div>
        
        <div className="space-y-6 text-sm text-slate-300">
          <div>
            <p className="leading-relaxed text-base text-slate-200">{data.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 border border-emerald-500/20">
              <h4 className="flex items-center space-x-2 font-medium text-emerald-300 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Top Highlight</span>
              </h4>
              <p>{data.topPositive}</p>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4 border border-amber-500/20">
              <h4 className="flex items-center space-x-2 font-medium text-amber-300 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Main Attention</span>
              </h4>
              <p>{data.mainAttention}</p>
            </div>
          </div>

          <div className="bg-cyan-900/20 rounded-lg p-4 mt-2 border border-cyan-500/30">
            <h4 className="flex items-center space-x-2 font-medium text-cyan-300 mb-2">
              <ArrowRightCircle className="w-4 h-4" />
              <span>Next Action</span>
            </h4>
            <p className="text-slate-200 font-medium">{data.nextAction}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
