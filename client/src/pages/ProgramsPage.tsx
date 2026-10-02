import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { startWorkout, getActiveWorkout } from "../services/workoutSession.service";
import { getProgramAnalytics } from "../services/programAnalytics.service";
import {
  Calendar,
  CheckCircle,
  Play,
  Target,
  Activity,
  Dumbbell,
  Plus,
  ArrowRight,
  Info,
  CalendarCheck
} from "lucide-react";

export default function ProgramsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Today's Schedule (provides authoritative currentWeek and currentDay)
  const { data: schedule, isLoading: loadingSchedule, error: scheduleError } = useQuery({
    queryKey: ["programs", "active", "today", user?.id],
    queryFn: async () => {
      const response = await api.get("/api/programs/active/today");
      return response.data.data.schedule;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // 2. Fetch All Programs (to find the active one and any others)
  const { data: programs, isLoading: loadingPrograms } = useQuery({
    queryKey: ["programs", user?.id],
    queryFn: async () => {
      const response = await api.get("/api/programs");
      return response.data.data.programs;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch Analytics for the active program
  const activeProgramId = schedule?.programId;
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["programAnalytics", activeProgramId],
    queryFn: () => getProgramAnalytics(activeProgramId!),
    enabled: !!activeProgramId,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Fetch Workouts (to resolve workout IDs to names)
  const { data: workouts, isLoading: loadingWorkouts } = useQuery({
    queryKey: ["workouts", user?.id],
    queryFn: async () => {
      const response = await api.get("/api/workouts");
      return response.data.data.workouts;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 5. Fetch Active Workout
  const { data: activeWorkout, isLoading: loadingActive } = useQuery({
    queryKey: ["activeWorkout"],
    queryFn: getActiveWorkout,
    staleTime: 5 * 60 * 1000,
  });

  const startMutation = useMutation({
    mutationFn: () => {
      if (!schedule?.workout?._id || !schedule?.programId) throw new Error("Missing schedule data");
      return startWorkout(schedule.workout._id, {
        programId: schedule.programId,
        programWeek: schedule.currentWeek,
        programDay: schedule.currentDay
      });
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      navigate(`/workouts/session/${session.id}`);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to start workout");
    },
  });

  // Derived state (evaluated deterministically)
  const activeProgram = programs?.find((p: any) => p.status === "active");
  const otherPrograms = programs?.filter((p: any) => p.status !== "active") || [];
  const isLoading = loadingSchedule || loadingPrograms || (!!activeProgramId && loadingAnalytics) || loadingWorkouts || loadingActive;
  const hasActiveProgram = schedule?.hasActiveProgram && activeProgram;

  const formatTimeAgo = (dateString: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  };

  const getWorkoutName = (workoutId: string | null) => {
    if (!workoutId) return "Rest Day";
    const w = workouts?.find((w: any) => w._id === workoutId || w.id === workoutId);
    return w?.name || "Unknown Workout";
  };

  // --- RENDERING --- //

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E5E7EB] rounded animate-pulse"></div>
        <div className="h-64 bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] animate-pulse"></div>
        <div className="h-32 bg-[#FFFFFF] rounded-2xl border border-[#E5E7EB] animate-pulse"></div>
      </div>
    );
  }

  if (scheduleError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <Info className="mx-auto text-red-500 mb-3" size={32} />
        <h3 className="text-base font-bold text-[#111827] mb-2">Error Loading Programs</h3>
        <p className="text-sm text-[#6B7280] mb-5">
          {(scheduleError as any).response?.data?.message || "We could not load your program data."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block rounded-lg bg-[#F1F3F5] px-6 py-3 font-semibold text-[#111827] transition hover:bg-[#E5E7EB]"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!hasActiveProgram) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#111827]">Programs</h1>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F1F3F5] mb-4">
            <Calendar className="h-8 w-8 text-[#6B7280]" />
          </div>
          <h2 className="text-xl font-bold text-[#111827] mb-2">No Active Program</h2>
          <p className="text-sm text-[#6B7280] max-w-md mx-auto mb-6">
            Build or select a structured training program to organize your workouts and track your progression over time.
          </p>
          <Link
            to="/programs/builder"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 min-h-[44px]"
          >
            <Plus size={20} />
            Create Program
          </Link>
        </div>

        {otherPrograms.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-4 mt-8">
              Other Programs
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {otherPrograms.map((program: any) => (
                <div key={program.id} className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[#111827]">{program.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-1 bg-[#F1F3F5] text-[#6B7280] rounded uppercase tracking-wider">
                        {program.status}
                      </span>
                    </div>
                    {program.goal && <p className="text-sm text-[#6B7280] mb-4">{program.goal}</p>}
                    <p className="text-xs font-bold text-[#6B7280] uppercase">
                      {program.weeks?.length || 0} Weeks
                    </p>
                  </div>
                  <div className="mt-5 flex gap-2 border-t border-[#E5E7EB] pt-4">
                    <Link
                      to={`/programs/${program.id}/analytics`}
                      className="flex-1 rounded-lg bg-[#F1F3F5] py-2 text-center text-sm font-semibold text-[#111827] hover:bg-[#E5E7EB] transition min-h-[40px] flex items-center justify-center"
                    >
                      View Stats
                    </Link>
                    <Link
                      to="/programs/builder"
                      className="flex-1 rounded-lg border border-[#E5E7EB] bg-white py-2 text-center text-sm font-semibold text-[#111827] hover:bg-[#F1F3F5] transition min-h-[40px] flex items-center justify-center"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // Active program state
  const currentWeekIndex = schedule?.currentWeek ?? 0;
  const currentDayIndex = schedule?.currentDay ?? 0;
  const currentWeekData = activeProgram.weeks?.[currentWeekIndex];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111827]">Programs</h1>
        <Link
          to="/programs/builder"
          className="rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F1F3F5] transition"
        >
          Manage
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN: ACTIVE PROGRAM & SCHEDULE */}
        <div className="space-y-6 lg:col-span-7">
          
          {/* Active Program Card */}
          <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <div className="bg-[#111827] p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Target size={120} />
              </div>
              <div className="relative z-10">
                <span className="inline-block rounded bg-cyan-600/20 text-cyan-400 px-2 py-1 text-[10px] font-bold uppercase tracking-wider mb-3">
                  Active Program
                </span>
                <h2 className="text-2xl font-bold mb-1">{activeProgram.name}</h2>
                {activeProgram.goal && <p className="text-slate-400 text-sm max-w-[80%]">{activeProgram.goal}</p>}
                
                <div className="mt-6 flex gap-8">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Week</p>
                    <p className="text-xl font-bold">{currentWeekIndex + 1} <span className="text-slate-500 text-base font-medium">/ {activeProgram.weeks?.length}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Day</p>
                    <p className="text-xl font-bold">{currentDayIndex + 1} <span className="text-slate-500 text-base font-medium">/ 7</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Session */}
            <div className="p-6">
              <h3 className="text-xs font-bold tracking-wider text-[#6B7280] uppercase mb-3">
                Today's Session
              </h3>
              
              {activeWorkout ? (
                <div className="bg-[#111827] p-5 rounded-xl border border-cyan-500 shadow-sm relative overflow-hidden text-white">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400"></div>
                  <h3 className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase mb-1">
                    Workout in Progress
                  </h3>
                  <p className="font-bold text-lg mb-1">
                    {typeof activeWorkout.workout === 'object' && activeWorkout.workout ? activeWorkout.workout.name : "Active Session"}
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Started: {formatTimeAgo(activeWorkout.startedAt)}
                  </p>
                  <button
                    onClick={() => navigate(`/workouts/session/${activeWorkout.id}`)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition active:bg-cyan-700 hover:bg-cyan-500 min-h-[44px]"
                  >
                    <Play size={18} className="fill-current" />
                    Resume Workout
                  </button>
                </div>
              ) : schedule?.isProgramFinished ? (
                <div className="flex items-center gap-4 bg-[#F7F8FA] p-4 rounded-xl border border-[#E5E7EB]">
                  <CheckCircle className="text-green-500" size={32} />
                  <div>
                    <p className="font-bold text-[#111827]">Program Complete!</p>
                    <p className="text-sm text-[#6B7280]">You have finished all scheduled weeks.</p>
                  </div>
                </div>
              ) : schedule?.isCompletedToday ? (
                <div className="flex items-center gap-4 bg-[#F7F8FA] p-4 rounded-xl border border-[#E5E7EB]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 shrink-0">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">Workout Complete</p>
                    <p className="text-sm text-[#6B7280]">You've crushed today's training. Rest up!</p>
                  </div>
                </div>
              ) : schedule?.isRestDay ? (
                <div className="flex items-center gap-4 bg-[#F7F8FA] p-4 rounded-xl border border-[#E5E7EB]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E7EB] text-[#6B7280] shrink-0">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">Rest Day</p>
                    <p className="text-sm text-[#6B7280]">Recovery is just as important as training.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F7F8FA] p-5 rounded-xl border border-[#E5E7EB]">
                  <p className="font-bold text-[#111827] text-lg mb-1">{schedule?.workout?.name}</p>
                  {schedule?.workout?.description && (
                    <p className="text-sm text-[#6B7280] mb-5 line-clamp-2">{schedule.workout.description}</p>
                  )}
                  <button
                    onClick={() => startMutation.mutate()}
                    disabled={startMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-70 min-h-[44px]"
                  >
                    <Play size={18} className="fill-current" />
                    {startMutation.isPending ? "Starting..." : "Start Workout"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Week Schedule */}
          {currentWeekData && (
            <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-4">
                Schedule • Week {currentWeekIndex + 1}
              </h2>
              <div className="space-y-2">
                {currentWeekData.days.map((day: any) => {
                  const isToday = day.dayIndex === currentDayIndex;
                  const isPast = day.dayIndex < currentDayIndex;
                  const workoutName = getWorkoutName(day.workoutId);
                  const isRest = !day.workoutId;
                  
                  // We only know definitive completion for today via the schedule endpoint.
                  const completed = isToday && schedule?.isCompletedToday;

                  return (
                    <div 
                      key={day.dayIndex} 
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        isToday ? 'border-cyan-500 bg-cyan-50' : 'border-[#E5E7EB] bg-[#F7F8FA]'
                      }`}
                    >
                      <div className="w-12 text-center shrink-0">
                        <span className={`text-xs font-bold uppercase ${isToday ? 'text-cyan-700' : 'text-[#6B7280]'}`}>
                          Day {day.dayIndex + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1 font-medium text-[#111827]">
                        {workoutName}
                      </div>

                      <div className="shrink-0">
                        {completed ? (
                          <CheckCircle className="text-green-500" size={20} />
                        ) : isRest ? (
                          <span className="text-[10px] font-bold px-2 py-1 bg-[#E5E7EB] text-[#6B7280] rounded uppercase tracking-wider">Rest</span>
                        ) : isToday ? (
                          <span className="text-[10px] font-bold px-2 py-1 bg-cyan-600 text-white rounded uppercase tracking-wider">Today</span>
                        ) : isPast ? (
                           <span className="text-[10px] font-bold px-2 py-1 bg-[#F1F3F5] text-[#6B7280] rounded uppercase tracking-wider">Scheduled</span>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-[#E5E7EB]"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: PROGRESS & UPCOMING */}
        <div className="space-y-6 lg:col-span-5">

          {/* Program Progress / Analytics Snapshot */}
          <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase">
                Program Progress
              </h2>
              <Link to={`/programs/${activeProgram.id}/analytics`} className="text-cyan-600 hover:text-cyan-700">
                <ArrowRight size={20} />
              </Link>
            </div>
            
            {analytics ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 text-center flex flex-col items-center justify-center">
                  <Target size={20} className="text-cyan-600 mb-2" />
                  <p className="text-2xl font-bold text-[#111827] leading-none mb-1">{analytics.adherence?.percentage || 0}%</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Adherence</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 text-center flex flex-col items-center justify-center">
                  <CalendarCheck size={20} className="text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-[#111827] leading-none mb-1">{analytics.adherence?.completedSessions || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Sessions</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 text-center flex flex-col items-center justify-center">
                  <Activity size={20} className="text-purple-500 mb-2" />
                  <p className="text-2xl font-bold text-[#111827] leading-none mb-1">{analytics.volume?.totalCompletedSets || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Total Sets</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 text-center flex flex-col items-center justify-center">
                  <Dumbbell size={20} className="text-amber-500 mb-2" />
                  <p className="text-2xl font-bold text-[#111827] leading-none mb-1">{analytics.volume?.totalReps || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Total Reps</p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-[#E5E7EB] bg-[#F7F8FA] rounded-xl text-[#6B7280] text-sm">
                Analytics will appear once you complete your first workout in this program.
              </div>
            )}
          </section>

          {/* Upcoming Next Week (if available) */}
          {activeProgram.weeks && currentWeekIndex + 1 < activeProgram.weeks.length && (
            <section className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm">
              <h2 className="text-sm font-bold tracking-wider text-[#6B7280] uppercase mb-4">
                Up Next • Week {currentWeekIndex + 2}
              </h2>
              <div className="space-y-3">
                {activeProgram.weeks[currentWeekIndex + 1].days.slice(0, 4).map((day: any) => {
                  if (!day.workoutId) return null; // Skip rest days in upcoming preview
                  return (
                    <div key={day.dayIndex} className="flex justify-between items-center p-3 border border-[#E5E7EB] bg-[#F7F8FA] rounded-xl">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-0.5">Day {day.dayIndex + 1}</p>
                        <p className="font-medium text-[#111827] text-sm">{getWorkoutName(day.workoutId)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
