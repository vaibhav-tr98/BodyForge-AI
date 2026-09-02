import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { analyticsService } from "../../services/analytics.service";

export default function TrainingReadinessSection() {
  const { data: readiness, isLoading } = useQuery({
    queryKey: ["analytics", "readiness"],
    queryFn: () => analyticsService.getTrainingReadiness(),
    staleTime: 5 * 60 * 1000,
  });
  
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-cyan-500" size={20} />
          TRAINING READINESS
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center animate-pulse">
           <div className="h-6 w-32 bg-slate-800 rounded mx-auto mb-4"></div>
        </div>
      </section>
    );
  }

  if (!readiness) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-cyan-500" size={20} />
          TRAINING READINESS
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-lg font-medium text-white mb-2">Not enough training history yet.</p>
          <p className="text-slate-400">Complete a few workouts to start seeing training-readiness insights.</p>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "text-green-500";
      case "moderate": return "text-yellow-500";
      case "light": return "text-orange-500";
      case "recent": return "text-red-500";
      default: return "text-slate-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-500";
      case "moderate": return "bg-yellow-500";
      case "light": return "bg-orange-500";
      case "recent": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  const statusText: Record<string, string> = {
    "ready": "READY TO TRAIN",
    "moderate": "MODERATE",
    "light": "LIGHT / CONSIDER REDUCING LOAD",
    "recent": "RECENTLY TRAINED",
    "no_history": "READY TO TRAIN"
  };

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
        <Activity className="text-cyan-500" size={20} />
        TRAINING READINESS
      </h2>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl font-bold text-white">{readiness.overallScore}</span>
                <div className={`h-4 w-4 rounded-full ${getStatusBg(readiness.status)}`}></div>
                <span className={`font-bold tracking-wide ${getStatusColor(readiness.status)}`}>{statusText[readiness.status]}</span>
              </div>
              
              {readiness.recommendation.muscleGroups.length > 0 ? (
                <>
                  <p className="text-xl font-semibold text-cyan-400 mt-4 mb-1">
                    {readiness.recommendation.muscleGroups.join(" + ")}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {readiness.recommendation.reason}
                  </p>
                </>
              ) : (
                <>
                  {readiness.status === "no_history" || readiness.overallScore >= 80 ? (
                    <p className="text-xl font-semibold text-slate-300 mt-4 mb-1">ANY MUSCLE GROUP</p>
                  ) : (
                    <p className="text-xl font-semibold text-slate-300 mt-4 mb-1">REST / LIGHT DAY</p>
                  )}
                  <p className="text-slate-400 text-sm">
                    {readiness.recommendation.reason}
                  </p>
                </>
              )}
            </div>
            
            <div className="shrink-0 flex flex-col gap-3">
              <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                {expanded ? "Hide Details" : "View Details"}
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-800 bg-slate-950/50 p-6 md:p-8">
            <h3 className="text-sm font-bold tracking-wider text-slate-500 mb-6">WHY? (MUSCLE READINESS BREAKDOWN)</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {readiness.muscleGroups.map(m => (
                <div key={m.muscle} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white uppercase">{m.muscle}</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${getStatusBg(m.status)}`}></div>
                      <span className={`font-bold ${getStatusColor(m.status)}`}>{m.readinessScore}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 font-medium mb-1">
                    {m.status === 'ready' ? 'Ready' : m.status === 'moderate' ? 'Moderate' : m.status === 'light' ? 'Light' : m.status === 'no_history' ? 'Untracked' : 'Recently trained'}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    {m.status === 'ready' ? '?' : m.status === 'no_history' ? '?' : '?'} {m.daysSinceLastTrained === null ? "No recorded history" : m.daysSinceLastTrained === 0 ? "Trained today" : m.daysSinceLastTrained === 1 ? "Trained yesterday" : m.daysSinceLastTrained + " days since last session"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}





