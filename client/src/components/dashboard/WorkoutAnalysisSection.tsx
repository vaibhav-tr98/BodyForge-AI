import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRightCircle } from "lucide-react";
import { useWorkoutAnalysis } from "../../hooks/useWorkoutAnalysis";

interface WorkoutAnalysisSectionProps {
  date?: Date;
}

export const WorkoutAnalysisSection: React.FC<WorkoutAnalysisSectionProps> = ({ date = new Date() }) => {
  const dateString = date.toISOString().split("T")[0];
  const { data, isLoading, isError } = useWorkoutAnalysis(dateString);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 animate-pulse h-full">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white tracking-wide">AI WORKOUT ANALYSIS</h3>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 h-full">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white tracking-wide">AI WORKOUT ANALYSIS</h3>
        </div>
        <p className="text-gray-400 text-sm">AI analysis is temporarily unavailable.</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 h-full mt-6">
      <div className="flex items-center space-x-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white tracking-wide">AI WORKOUT ANALYSIS</h3>
      </div>
      
      <div className="space-y-6 text-sm text-gray-300">
        <div>
          <p className="leading-relaxed">{data.summary}</p>
        </div>

        {data.positives && data.positives.length > 0 && (
          <div>
            <h4 className="flex items-center space-x-2 font-medium text-white mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>What is going well</span>
            </h4>
            <ul className="space-y-1 list-none pl-6">
              {data.positives.map((item: string, idx: number) => (
                <li key={idx} className="relative before:content-['•'] before:absolute before:-left-4 before:text-gray-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.attention && data.attention.length > 0 && (
          <div>
            <h4 className="flex items-center space-x-2 font-medium text-white mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Needs attention</span>
            </h4>
            <ul className="space-y-1 list-none pl-6">
              {data.attention.map((item: string, idx: number) => (
                <li key={idx} className="relative before:content-['•'] before:absolute before:-left-4 before:text-gray-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.nextAction && (
          <div className="bg-gray-700/50 rounded-lg p-4 mt-2">
            <h4 className="flex items-center space-x-2 font-medium text-white mb-2">
              <ArrowRightCircle className="w-4 h-4 text-cyan-400" />
              <span>Next action</span>
            </h4>
            <p className="text-gray-300">{data.nextAction}</p>
          </div>
        )}
      </div>
    </div>
  );
};
