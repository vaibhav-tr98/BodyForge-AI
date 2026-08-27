import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRightCircle } from "lucide-react";
import { useReadinessAnalysis } from "../../hooks/useReadinessAnalysis";

export const ReadinessAnalysisSection: React.FC = () => {
  const { data, isLoading, isError } = useReadinessAnalysis();

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 animate-pulse mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white tracking-wide uppercase">AI Readiness Analysis</h3>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white tracking-wide uppercase">AI Readiness Analysis</h3>
        </div>
        <p className="text-slate-400 text-sm">AI analysis is temporarily unavailable.</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800 mt-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110"></div>
      
      <div className="relative z-10">
        <div className="flex items-center space-x-2 mb-6">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white tracking-wide uppercase">AI Readiness Analysis</h3>
        </div>
        
        <div className="space-y-6 text-sm text-slate-300">
          <div>
            <p className="leading-relaxed text-base">{data.summary}</p>
          </div>

          {data.positives && data.positives.length > 0 && (
            <div>
              <h4 className="flex items-center space-x-2 font-medium text-white mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ready to go</span>
              </h4>
              <ul className="space-y-2 list-none pl-6">
                {data.positives.map((item: string, idx: number) => (
                  <li key={idx} className="relative before:content-['•'] before:absolute before:-left-4 before:text-slate-500">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.attention && data.attention.length > 0 && (
            <div>
              <h4 className="flex items-center space-x-2 font-medium text-white mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Needs recovery</span>
              </h4>
              <ul className="space-y-2 list-none pl-6">
                {data.attention.map((item: string, idx: number) => (
                  <li key={idx} className="relative before:content-['•'] before:absolute before:-left-4 before:text-slate-500">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.nextAction && (
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mt-4">
              <h4 className="flex items-center space-x-2 font-semibold text-white mb-2">
                <ArrowRightCircle className="w-4 h-4 text-cyan-400" />
                <span>Recommended Action</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">{data.nextAction}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
