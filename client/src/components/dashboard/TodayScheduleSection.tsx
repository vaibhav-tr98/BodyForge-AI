import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Play, CheckCircle, Info, BarChart2 } from "lucide-react";
import { api } from "../../services/api";
import Loader from "../ui/Loader";
import { startWorkout } from "../../services/workoutSession.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function TodayScheduleSection() {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await api.get("/api/programs/active/today");
        setSchedule(response.data.data.schedule);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load today's schedule");
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const queryClient = useQueryClient();
  
  const startMutation = useMutation({
    mutationFn: () => startWorkout(schedule.workout._id, {
      programId: schedule.programId,
      programWeek: schedule.currentWeek,
      programDay: schedule.currentDay
    }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      navigate(`/workouts/session/${session.id}`);
    },
    onError: (error: any) => {
      alert(error.message || "Failed to start workout");
    },
  });

  const handleStartWorkout = () => {
    if (!schedule?.workout?._id) return;
    startMutation.mutate();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6 border border-slate-800 rounded-2xl bg-slate-900">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} />
          <p className="font-medium">Error loading schedule</p>
        </div>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  if (!schedule?.hasActiveProgram) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <Calendar className="mx-auto text-slate-400 mb-3" size={32} />
        <h3 className="text-lg font-bold text-white mb-2">No Active Program</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          You don't have an active training program. Build a multi-week program to get structured training.
        </p>
        <Link
          to="/programs/builder"
          className="inline-block rounded-lg bg-cyan-600 px-6 py-2.5 font-semibold text-white transition hover:bg-cyan-700"
        >
          Create Program
        </Link>
      </div>
    );
  }

  if (schedule.isProgramFinished) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
        <CheckCircle className="mx-auto text-green-400 mb-3" size={32} />
        <h3 className="text-lg font-bold text-green-400 mb-2">Program Complete!</h3>
        <p className="text-green-400/80 mb-6 max-w-md mx-auto">
          Congratulations! You have finished your current training program.
        </p>
        <Link
          to="/programs/builder"
          className="inline-block rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white transition hover:bg-green-700"
        >
          Start New Program
        </Link>
      </div>
    );
  }

  if (schedule.isCompletedToday) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Week {schedule.currentWeek + 1}, Day {schedule.currentDay + 1}</p>
            <h3 className="text-lg font-bold text-white">Today's Workout Complete</h3>
          </div>
        </div>
        <Link
          to={`/programs/${schedule.programId}/analytics`}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <BarChart2 size={16} />
          Analytics
        </Link>
      </div>
    );
  }

  if (schedule.isRestDay) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Week {schedule.currentWeek + 1}, Day {schedule.currentDay + 1}</p>
            <h3 className="text-lg font-bold text-white">Rest Day</h3>
            <p className="text-sm text-slate-500 mt-1">Take it easy and recover.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/workouts"
            className="rounded-lg border border-slate-700 px-4 py-2 font-medium text-white transition hover:bg-slate-800 text-center"
          >
            Log Ad-Hoc Workout
          </Link>
          <Link
            to={`/programs/${schedule.programId}/analytics`}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <BarChart2 size={16} />
            Analytics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-900 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-cyan-400 mb-1 uppercase tracking-wider">
          Week {schedule.currentWeek + 1} &bull; Day {schedule.currentDay + 1}
        </p>
        <h3 className="text-xl font-bold text-white mb-2">{schedule.workout?.name || "Scheduled Workout"}</h3>
        {schedule.workout?.description && (
          <p className="text-sm text-slate-400 line-clamp-2 max-w-lg">{schedule.workout.description}</p>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <button
          onClick={handleStartWorkout}
          className="flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white shadow-[0_0_15px_rgba(8,145,178,0.4)] transition hover:bg-cyan-500"
        >
          <Play size={18} className="fill-current" />
          Start Workout
        </button>
        <Link
          to={`/programs/${schedule.programId}/analytics`}
          className="flex min-w-[160px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 py-2.5 font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <BarChart2 size={16} />
          Program Analytics
        </Link>
      </div>
    </div>
  );
}
