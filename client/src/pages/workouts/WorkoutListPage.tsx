import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit3, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { getWorkouts, deleteWorkout } from "../../services/workout.service";
import Loader from "../../components/ui/Loader";

export default function WorkoutListPage() {
  const queryClient = useQueryClient();

  const { data: workouts, isLoading, isError } = useQuery({
    queryKey: ["workouts"],
    queryFn: getWorkouts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete workout");
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this workout?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load workouts. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Workouts</h1>
          <p className="mt-2 text-slate-400">
            Manage your training routines and track progress.
          </p>
        </div>
        <Link
          to="/workouts/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
        >
          <Plus className="h-5 w-5" />
          Create Workout
        </Link>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {!workouts || workouts.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
          <div className="rounded-full bg-slate-800 p-4">
            <Plus className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">No workouts yet</h3>
          <p className="mt-2 max-w-sm text-slate-400">
            You haven't created any workouts. Create your first routine to get started on your fitness journey.
          </p>
          <Link
            to="/workouts/new"
            className="mt-6 rounded-lg bg-cyan-600 px-6 py-2.5 font-semibold text-white transition hover:bg-cyan-700"
          >
            Create Your First Workout
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-slate-700 hover:shadow-lg"
            >
              <div>
                <h3 className="text-xl font-semibold text-white line-clamp-1" title={workout.name}>
                  {workout.name}
                </h3>
                {workout.description && (
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {workout.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-sm text-cyan-400/80">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-950 text-xs font-bold text-cyan-400">
                    {workout.exercises.length}
                  </span>
                  exercises
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-slate-800 pt-4">
                <Link
                  to={`/workouts/${workout.id}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
                <Link
                  to={`/workouts/${workout.id}/edit`}
                  className="flex items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
                  title="Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(workout.id)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
