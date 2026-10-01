import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { analyticsService } from "../../services/analytics.service";

export default function TrainingReadinessSection() {
  const { data: readiness, isLoading } = useQuery({
    queryKey: ["analytics", "readiness"],
    queryFn: () => analyticsService.getTrainingReadiness(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3">
          Readiness
        </h2>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm animate-pulse min-h-[80px]">
          <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-2"></div>
          <div className="h-3 w-48 bg-[#E5E7EB] rounded"></div>
        </div>
      </section>
    );
  }

  if (!readiness) {
    return (
      <section>
        <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3 flex items-center gap-2">
          <Activity size={14} className="text-cyan-600" />
          Readiness
        </h2>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm text-center">
          <p className="text-sm font-medium text-[#6B7280]">
            Complete a few workouts to unlock readiness insights.
          </p>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "text-emerald-700 bg-emerald-50";
      case "moderate": return "text-amber-700 bg-amber-50";
      case "light": return "text-orange-700 bg-orange-50";
      case "recent": return "text-rose-700 bg-rose-50";
      default: return "text-[#6B7280] bg-[#F1F3F5]";
    }
  };

  const statusText: Record<string, string> = {
    "ready": "READY",
    "moderate": "MODERATE",
    "light": "LIGHT",
    "recent": "RECOVERING",
    "no_history": "READY"
  };

  return (
    <section>
      <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-3 flex items-center gap-2">
        <Activity size={14} className="text-cyan-600" />
        Readiness
      </h2>
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827] mb-1">
            {readiness.recommendation.muscleGroups.length > 0
              ? readiness.recommendation.muscleGroups.join(" + ")
              : (readiness.status === "no_history" || readiness.overallScore >= 80 ? "Any Muscle Group" : "Rest Day")}
          </h3>
          <p className="text-xs text-[#6B7280] line-clamp-2">
            {readiness.recommendation.reason}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg flex flex-col items-center justify-center shrink-0 ml-4 ${getStatusColor(readiness.status)}`}>
          <span className="text-lg font-bold leading-none mb-0.5">{readiness.overallScore}</span>
          <span className="text-[9px] font-bold tracking-wider uppercase">{statusText[readiness.status]}</span>
        </div>
      </div>
    </section>
  );
}
