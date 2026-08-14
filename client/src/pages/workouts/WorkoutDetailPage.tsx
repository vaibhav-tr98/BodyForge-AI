import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Edit3 } from "lucide-react";
import { getWorkoutById } from "../../services/workout.service";
import Loader from "../../components/ui/Loader";

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: workout, isLoading, isError } = useQuery({
    queryKey: ["workouts", id],
    queryFn: () => getWorkoutById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError || !workout) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load workout details. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── Navigation & Actions ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/workouts"
          className="flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workouts
        </Link>

        <Link
          to={`/workouts/${workout.id}/edit`}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-3xl font-bold text-white">{workout.name}</h1>
        {workout.description && (
          <p className="mt-4 text-lg text-slate-400">{workout.description}</p>
        )}
        <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
          <span>Created: {new Date(workout.createdAt).toLocaleDateString()}</span>
          <span>&bull;</span>
          <span>{workout.exercises.length} exercises</span>
        </div>
      </div>

      {/* ── Exercises List ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Exercises</h2>
        <div className="grid gap-4">
          {workout.exercises.map((exercise, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-950 font-bold text-cyan-400">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {exercise.name}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-6 sm:justify-end">
                <div className="text-center">
                  <div className="text-sm text-slate-400">Sets</div>
                  <div className="font-semibold text-white">{exercise.sets}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-400">Reps</div>
                  <div className="font-semibold text-white">{exercise.reps}</div>
                </div>
                {exercise.weight !== undefined && (
                  <div className="text-center">
                    <div className="text-sm text-slate-400">Weight</div>
                    <div className="font-semibold text-white">
                      {exercise.weight} kg
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
