import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Calendar, CheckCircle } from "lucide-react";
import { getWorkoutSessions } from "../../services/workoutSession.service";
import Loader from "../../components/ui/Loader";

export default function WorkoutHistoryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workoutSessions", { page: 1 }],
    queryFn: () => getWorkoutSessions(1, 20),
  });

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
        Failed to load workout history.
      </div>
    );
  }

  const sessions = data?.sessions || [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Workout History</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-lg text-slate-400">No workouts completed yet.</p>
          <Link
            to="/workouts"
            className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-2 font-medium text-white transition hover:bg-cyan-700"
          >
            Start a Workout
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/workouts/session/${session.id}/detail`}
              className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500/50 hover:bg-slate-800"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 truncate pr-2">
                    {typeof session.workout === 'object' ? session.workout.name : "Workout"}
                  </h3>
                  {session.status === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                <div className="mt-4 space-y-2 text-sm text-slate-400">
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
                        min
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 border-t border-slate-800 pt-4 text-xs font-medium text-slate-500">
                {session.exercises.length} exercises
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
