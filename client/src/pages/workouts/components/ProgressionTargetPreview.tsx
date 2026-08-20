import { useQuery } from "@tanstack/react-query";
import { getExerciseRecommendation } from "../../../services/progression.service";

interface Props {
  exerciseName: string;
  plannedSets: number;
  plannedReps: number;
}

export default function ProgressionTargetPreview({ exerciseName, plannedSets, plannedReps }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["progression", "recommendation", exerciseName, plannedSets, plannedReps],
    queryFn: () => getExerciseRecommendation(exerciseName, plannedSets, plannedReps),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="mt-4 text-sm text-slate-500">Loading target...</div>;
  }

  if (!data || !data.recommendation) {
    return (
      <div className="mt-4 text-sm text-slate-400 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
        <span className="font-medium text-cyan-400 block mb-1">Target:</span>
        First session — focus on finding a comfortable working weight.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg bg-slate-950 p-4 border border-slate-800">
      <div className="grid sm:grid-cols-2 gap-4">
        {data.latestPerformance && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Session</div>
            <div className="font-mono text-sm text-slate-300">
              {data.latestPerformance.weight > 0 ? `${data.latestPerformance.weight} kg × ` : ''}
              {Math.round(data.latestPerformance.totalReps / Math.max(1, data.latestPerformance.setsCompleted))} reps × {data.latestPerformance.setsCompleted} sets
            </div>
          </div>
        )}
        <div>
          <div className="text-xs text-cyan-500 uppercase tracking-wider mb-1">Today's Target</div>
          <div className="font-mono text-sm text-white font-medium">
            {data.recommendation.weight > 0 ? `${data.recommendation.weight} kg × ` : ''}
            {data.recommendation.minReps}–{data.recommendation.maxReps} reps × {data.recommendation.sets} sets
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-slate-400 flex gap-2">
        <span className="text-cyan-400 font-medium whitespace-nowrap">Why:</span>
        <span>{data.reason}</span>
      </div>
    </div>
  );
}

