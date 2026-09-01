import React from "react";
import { 
  Lightbulb, 
  AlertCircle, 
  Dumbbell, 
  Utensils, 
  CheckCircle,
  Activity
} from "lucide-react";
import { useInsight } from "../../hooks/useInsight";

export const BodyForgeInsightSection: React.FC = () => {
  // Use local date string YYYY-MM-DD
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${day}`;
  const { data: insight, isLoading, isError } = useInsight(todayDateStr);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-800 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-5 bg-slate-800 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (isError || !insight) {
    // Graceful fallback
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start gap-4">
        <div className="bg-slate-800/50 p-3 rounded-lg text-slate-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">BodyForge Insight</h2>
          <p className="text-slate-400 text-sm">Insight currently unavailable.</p>
        </div>
      </div>
    );
  }

  const getIcon = () => {
    switch (insight.type) {
      case "history_needed":
        return <Activity className="w-6 h-6 text-cyan-400" />;
      case "nutrition_config_needed":
      case "nutrition_gap":
        return <Utensils className="w-6 h-6 text-orange-400" />;
      case "on_track":
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case "no_workout":
        return <Dumbbell className="w-6 h-6 text-slate-400" />;
      default:
        return <Lightbulb className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getBorderColor = () => {
    if (insight.priority === "high") return "border-orange-500/50";
    if (insight.priority === "medium") return "border-yellow-500/30";
    return "border-slate-800";
  };

  return (
    <div className={`bg-slate-900 border ${getBorderColor()} rounded-xl p-6 transition-all duration-300 hover:border-slate-700 relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110"></div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">{insight.title}</h2>
          </div>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
            {insight.message}
          </p>
          
          {/* Optional context pills */}
          <div className="flex flex-wrap gap-2 mt-2">
            {insight.context.workoutName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300">
                <Dumbbell className="w-3 h-3" />
                {insight.context.workoutName}
              </span>
            )}
            
            {insight.context.proteinPercent !== undefined && insight.context.proteinPercent > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300">
                <Utensils className="w-3 h-3" />
                Protein: {insight.context.proteinPercent}%
              </span>
            )}
            
            {insight.context.readinessScore !== undefined && insight.context.readinessScore > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300">
                <Activity className="w-3 h-3" />
                Readiness: {insight.context.readinessScore}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
