import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Play, Calendar, CheckCircle, Info } from "lucide-react";
import { api } from "../../services/api";
import { startWorkout } from "../../services/workoutSession.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";

export default function TodayScheduleSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: schedule, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["programs", "active", "today", user?.id],
    queryFn: async () => {
      const response = await api.get("/api/programs/active/today");
      return response.data.data.schedule;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const error = queryError ? (queryError as any).response?.data?.message || "Failed to load today's schedule" : "";

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
    onError: (err: any) => {
      alert(err.message || "Failed to start workout");
    },
  });

  const handleStartWorkout = () => {
    if (!schedule?.workout?._id) return;
    startMutation.mutate();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm min-h-[140px] animate-pulse">
        <div className="h-4 w-32 bg-[#E5E7EB] rounded mb-3"></div>
        <div className="h-6 w-48 bg-[#E5E7EB] rounded mb-4"></div>
        <div className="h-12 w-full bg-[#E5E7EB] rounded-lg mt-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-red-500">
          <Info size={16} />
          <p className="font-semibold text-sm">Error loading schedule</p>
        </div>
        <p className="text-sm text-[#6B7280]">{error}</p>
      </div>
    );
  }

  if (!schedule?.hasActiveProgram) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
        <Calendar className="mx-auto text-[#6B7280] mb-3" size={32} />
        <h3 className="text-base font-bold text-[#111827] mb-2">No Active Program</h3>
        <p className="text-sm text-[#6B7280] mb-5">
          Build a multi-week program to get structured training.
        </p>
        <Link
          to="/programs"
          className="inline-block w-full rounded-lg bg-[#F1F3F5] px-4 py-3 font-semibold text-[#111827] transition active:bg-[#E5E7EB]"
        >
          Create Program
        </Link>
      </div>
    );
  }

  if (schedule.isProgramFinished) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
        <CheckCircle className="mx-auto text-green-500 mb-3" size={32} />
        <h3 className="text-base font-bold text-[#111827] mb-2">Program Complete!</h3>
        <p className="text-sm text-[#6B7280] mb-5">
          Congratulations! You have finished your training program.
        </p>
        <Link
          to="/programs"
          className="inline-block w-full rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700"
        >
          Start New Program
        </Link>
      </div>
    );
  }

  if (schedule.isCompletedToday) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Workout Complete</h3>
            <p className="text-xs font-medium text-[#6B7280]">
              Week {schedule.currentWeek + 1}, Day {schedule.currentDay + 1}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (schedule.isRestDay) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
        <h2 className="text-xs font-bold tracking-wider text-[#6B7280] uppercase mb-1">
          TODAY
        </h2>
        <h3 className="text-lg font-bold text-[#111827] mb-1">Rest Day</h3>
        <p className="text-sm text-[#6B7280] mb-5">
          Recovery day — no workout scheduled.
        </p>
        <Link
          to="/workouts"
          className="flex items-center justify-center w-full rounded-lg bg-[#F1F3F5] px-4 py-3 font-semibold text-[#111827] transition active:bg-[#E5E7EB]"
        >
          Start Ad-Hoc Workout
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
      <div className="flex justify-between items-start mb-1">
        <h2 className="text-xs font-bold tracking-wider text-[#6B7280] uppercase">
          TODAY'S WORKOUT
        </h2>
        <span className="text-[10px] font-bold px-2 py-1 bg-[#F1F3F5] text-[#6B7280] rounded">
          W{schedule.currentWeek + 1} D{schedule.currentDay + 1}
        </span>
      </div>

      <h3 className="text-xl font-bold text-[#111827] mb-1">
        {schedule.workout?.name || "Scheduled Workout"}
      </h3>

      {schedule.workout?.description && (
        <p className="text-sm text-[#6B7280] mb-5 line-clamp-2">
          {schedule.workout.description}
        </p>
      )}

      <button
        onClick={handleStartWorkout}
        disabled={startMutation.isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 hover:bg-cyan-500 disabled:opacity-70 mt-5"
      >
        <Play size={18} className="fill-current" />
        {startMutation.isPending ? "Starting..." : "Start Workout"}
      </button>
    </div>
  );
}
