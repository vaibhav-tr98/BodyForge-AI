import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, Check } from "lucide-react";
import { getWorkoutSession } from "../../services/workoutSession.service";
import Loader from "../../components/ui/Loader";

export default function WorkoutSessionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ["workoutSession", id],
    queryFn: () => getWorkoutSession(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load session details.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/workouts/history"
          className="flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-3xl font-bold text-white">
          {typeof session.workout === 'object' ? session.workout.name : "Workout"}
        </h1>
        
        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(session.startedAt).toLocaleDateString()}</span>
          </div>
          {session.completedAt && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {Math.max(
                  1,
                  Math.round(
                    (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) /
                      60000
                  )
                )}{" "}
                min duration
              </span>
            </div>
          )}
          <div className="rounded bg-slate-800 px-2 py-1 font-medium capitalize text-slate-300">
            {session.status}
          </div>
        </div>
      </div>

      {/* Exercises Log */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Exercise Log</h2>
        
        {session.exercises.map((exercise, index) => (
          <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">
              {index + 1}. {exercise.exerciseName}
            </h3>
            
            <div className="space-y-2">
              {exercise.sets.map((set, setIdx) => (
                <div 
                  key={setIdx} 
                  className={`flex items-center gap-4 rounded-lg bg-slate-800/50 p-3 ${
                    set.completed ? "" : "opacity-50"
                  }`}
                >
                  <div className="w-16 text-sm font-medium text-slate-500">
                    Set {set.setNumber}
                  </div>
                  <div className="flex-1 font-mono text-cyan-400">
                    {set.weight} kg × {set.reps}
                  </div>
                  <div className="text-slate-400">
                    {set.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-xs uppercase">Skipped</span>
                    )}
                  </div>
                </div>
              ))}
              
              {exercise.sets.length === 0 && (
                <div className="p-3 text-sm text-slate-500 italic">
                  No sets logged.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
