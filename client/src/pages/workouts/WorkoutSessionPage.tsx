import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw, Loader2, AlertTriangle, Clock, Trophy, CheckCircle, Dumbbell } from "lucide-react";
import { toast } from "react-hot-toast";
import { getWorkoutSession, updateWorkoutSession, completeWorkoutSession } from "../../services/workoutSession.service";
import { useSessionSyncState, discardLocal } from "../../lib/syncQueue";
import Loader from "../../components/ui/Loader";
import type { SessionSet, WorkoutSession } from "../../types";

function WorkoutTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  });

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = Math.floor(elapsed % 60);

  if (h > 0) {
    return <>{h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</>;
  }
  return <>{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</>;
}

function RestTimer({ defaultSeconds = 90, autoStartTrigger = 0 }: { defaultSeconds?: number; autoStartTrigger?: number }) {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (autoStartTrigger > 0) {
      setEndTime(Date.now() + defaultSeconds * 1000);
      setTimeLeft(defaultSeconds);
      setIsActive(true);
    }
  }, [autoStartTrigger, defaultSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const tick = () => {
      if (!isActive || endTime === null) return;
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsActive(false);
        setEndTime(null);
        clearInterval(interval);
      }
    };

    if (isActive && endTime !== null) {
      tick();
      interval = setInterval(tick, 1000);

      const handleVisibilityChange = () => {
        if (!document.hidden) tick();
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [isActive, endTime]);

  const toggleTimer = () => {
    if (isActive) {
      setIsActive(false);
      setEndTime(null);
    } else {
      if (timeLeft > 0) {
        setEndTime(Date.now() + timeLeft * 1000);
        setIsActive(true);
      }
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setEndTime(null);
    setTimeLeft(defaultSeconds);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="bg-[#FFFFFF] border-y border-[#E5E7EB] sm:border sm:rounded-2xl sm:mx-0 mt-6 p-5 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-50 text-cyan-600">
          <Clock size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Rest Timer</span>
          <span className={`text-2xl font-bold tabular-nums leading-none mt-1 ${timeLeft === 0 ? "text-emerald-500" : "text-[#111827]"}`}>
            {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          aria-label={isActive ? "Pause timer" : "Play timer"}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[#111827] hover:bg-[#F1F3F5] transition shadow-sm"
        >
          {isActive ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          aria-label="Reset timer"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F1F3F5] transition shadow-sm"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => { setIsActive(false); setEndTime(null); setTimeLeft(defaultSeconds); }}
          aria-label="Dismiss timer"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition shadow-sm"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutSessionPage() {
  const { id } = useParams<{ id: string }>();
  const syncState = useSessionSyncState(id!);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [localSession, setLocalSession] = useState<WorkoutSession | null>(null);
  const [timerTrigger, setTimerTrigger] = useState(0);
  const [updatingSetIdx, setUpdatingSetIdx] = useState<number | null>(null);
  const isTogglingRef = useRef(false);

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ["workoutSession", id],
    queryFn: () => getWorkoutSession(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (session && !localSession) {
      setLocalSession(session);
    }
  }, [session, localSession]);

  const updateMutation = useMutation({
    mutationFn: async (data: WorkoutSession) => {
      if (!navigator.onLine) {
        throw new Error("offline");
      }
      return updateWorkoutSession(data.id, { exercises: data.exercises, expectedUpdatedAt: data.updatedAt });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["workoutSession", id], data);
      setLocalSession(prev => prev ? { ...prev, updatedAt: data.updatedAt } : prev);
    },
    onError: async (err: any, data: WorkoutSession) => {
      const isAxiosNetwork = err.isAxiosError && (!err.response || err.response.status >= 500 || err.response.status === 429);
      const isNetworkError = !navigator.onLine || err.message === "offline" || isAxiosNetwork;
      if (isNetworkError) {
        toast.success("Saved offline", { id: "offline-save", duration: 2000 });
        const { enqueueUpdateMutation } = await import("../../lib/syncQueue");
        const userId = typeof (data as any).user === 'string' ? (data as any).user : (data as any).user?._id || "unknown";
        await enqueueUpdateMutation(userId, data.id, { exercises: data.exercises }, data.updatedAt);
      } else {
        toast.error("Failed to save workout", { id: "failed-save-workout" });
      }
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) throw new Error("offline");
      return completeWorkoutSession(id!, undefined, localSession?.updatedAt);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSession", id] });

      if (data.newPersonalRecords && data.newPersonalRecords.length > 0) {
        data.newPersonalRecords.forEach(pr => {
          const prType = pr.type === "weight" ? "Weight" : pr.type === "reps" ? "Reps" : "Volume";
          const unit = pr.type === "weight" || pr.type === "volume" ? "kg" : "reps";
          toast.success(
            <div>
              <p className="font-bold text-lg">🏆 NEW PERSONAL RECORD</p>
              <p className="font-medium mt-1">{pr.exerciseName}</p>
              <p className="text-sm mt-1">{prType}: {pr.value} {unit}</p>
              <p className="text-xs opacity-80">Previous best: {pr.previousValue} {unit}</p>
            </div>,
            { duration: 6000 }
          );
        });
      } else {
        toast.success("Workout completed successfully!");
      }

      navigate("/workouts/history");
    },
    onError: async (err: any) => {
      const status = err?.response?.status;
      const isAxiosNetwork = err.isAxiosError && (!err.response || status >= 500 || status === 429);
      const isNetworkError = !navigator.onLine || err.message === "offline" || isAxiosNetwork;

      if (isNetworkError && localSession) {
        toast.success("Unable to reach server. Your workout is saved locally and will sync.", { duration: 3000 });
        const { enqueueCompleteMutation } = await import("../../lib/syncQueue");
        const userId = typeof (localSession as any).user === 'string' ? (localSession as any).user : (localSession as any).user?._id || "unknown";
        await enqueueCompleteMutation(userId, id!, localSession.updatedAt);
        navigate("/workouts/history");
      } else if (status === 409) {
        toast.error("Workout changed elsewhere. Please review and try again.", { duration: 4000 });
      } else if (status >= 500) {
        toast.error("Server error. Please try again.");
      } else {
        toast.error(err?.response?.data?.message || err.message || "Failed to complete workout");
      }
    }
  });

  if (isLoading || !localSession) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] p-6 text-center text-red-500 font-medium flex items-center justify-center">
        Failed to load workout session. Please try again.
      </div>
    );
  }

  const currentExercise = localSession.exercises[currentExerciseIndex];
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === localSession.exercises.length - 1;

  const activeSets = currentExercise.sets.length > 0 ? currentExercise.sets :
    Array.from({ length: currentExercise.plannedSets }).map((_, i) => ({
      setNumber: i + 1,
      weight: currentExercise.plannedWeight || 0,
      reps: currentExercise.plannedReps,
      completed: false
    }));

  const handleUpdateSet = (setIdx: number, field: keyof SessionSet, value: number | boolean) => {
    let finalValue = value;
    if (typeof value === "number") {
      if (field === "weight") {
        finalValue = Math.max(0, value);
      } else if (field === "reps") {
        finalValue = Math.max(1, value);
      }
    }

    const newSession = { ...localSession };
    const ex = newSession.exercises[currentExerciseIndex];

    if (ex.sets.length === 0) {
      ex.sets = Array.from({ length: ex.plannedSets }).map((_, i) => ({
        setNumber: i + 1,
        weight: ex.plannedWeight || 0,
        reps: ex.plannedReps,
        completed: false
      }));
    }

    ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: finalValue };
    setLocalSession(newSession);
  };

  const handleToggleComplete = (setIdx: number) => {
    if (updateMutation.isPending || isTogglingRef.current) return;
    isTogglingRef.current = true;

    const newSession = { ...localSession };
    const ex = newSession.exercises[currentExerciseIndex];

    if (ex.sets.length === 0) {
      ex.sets = Array.from({ length: ex.plannedSets }).map((_, i) => ({
        setNumber: i + 1,
        weight: ex.plannedWeight || 0,
        reps: ex.plannedReps,
        completed: false
      }));
    }

    const isNowCompleted = !ex.sets[setIdx].completed;
    ex.sets[setIdx].completed = isNowCompleted;
    setLocalSession(newSession);
    setUpdatingSetIdx(setIdx);

    if (isNowCompleted) {
        setTimerTrigger(Date.now());
      }

      const allSetsCompleted = isNowCompleted && ex.sets.every((s, i) => i === setIdx ? true : s.completed);
      const isLastEx = currentExerciseIndex === newSession.exercises.length - 1;

      if (allSetsCompleted && !isLastEx) {
        setTimeout(() => {
          setCurrentExerciseIndex(prev => prev + 1);
        }, 400);
      }

    updateMutation.mutate(newSession, {
      onSettled: () => {
        setUpdatingSetIdx(null);
        isTogglingRef.current = false;
      }
    });
  };

  const handleAddSet = () => {
    const newSession = { ...localSession };
    const ex = newSession.exercises[currentExerciseIndex];

    if (ex.sets.length === 0) {
      ex.sets = Array.from({ length: ex.plannedSets }).map((_, i) => ({
        setNumber: i + 1,
        weight: ex.plannedWeight || 0,
        reps: ex.plannedReps,
        completed: false
      }));
    }

    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
      setNumber: ex.sets.length + 1,
      weight: lastSet ? lastSet.weight : ex.plannedWeight || 0,
      reps: lastSet ? lastSet.reps : ex.plannedReps,
      completed: false
    });
    setLocalSession(newSession);
  };

  const saveAndGoNext = () => {
    updateMutation.mutate(localSession);
    if (!isLastExercise) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const saveAndGoPrev = () => {
    updateMutation.mutate(localSession);
    if (!isFirstExercise) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const totalSets = localSession?.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0) || 0;
  const totalVolume = localSession?.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).reduce((sum, s) => sum + (s.weight * s.reps), 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] pb-[140px] font-sans">
      <header className="bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 py-3 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-[#6B7280] p-2 -ml-2 hover:bg-[#F7F8FA] rounded-full transition"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 text-center px-2">
          <h1 className="text-base font-bold text-[#111827] truncate">
            {typeof localSession.workout === 'object' ? localSession.workout.name : "Workout Session"}
          </h1>
          <p className="text-xs text-[#6B7280] font-medium mt-0.5 flex items-center justify-center gap-1.5">
            <Clock size={12} className="text-cyan-600" />
            <span className="font-bold tabular-nums"><WorkoutTimer startedAt={localSession.startedAt} /></span>
          </p>
        </div>
        <div className="w-12 flex justify-end">
          {updateMutation.isPending ? (
            <Loader2 size={18} className="animate-spin text-cyan-600 mr-2" />
          ) : (
            <button
              onClick={() => updateMutation.mutate(localSession)}
              className="text-cyan-600 text-sm font-bold p-2 -mr-2 transition hover:opacity-80"
              disabled={updateMutation.isPending}
            >
              Save
            </button>
          )}
        </div>
      </header>

      {/* Mobile Summary */}
      <div className="md:hidden flex justify-between bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 py-3 shadow-sm">
        <div className="text-center flex-1">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Volume</p>
          <p className="text-sm font-bold text-[#111827] mt-0.5">{totalVolume} kg</p>
        </div>
        <div className="w-px bg-[#E5E7EB]" />
        <div className="text-center flex-1">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Sets</p>
          <p className="text-sm font-bold text-[#111827] mt-0.5">{totalSets}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl md:px-6 pt-4 md:pt-6 space-y-6">
        {syncState.conflict && (
          <div className="mx-4 md:mx-0 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 text-red-500 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-red-800">Sync Conflict</p>
                <p className="mt-1 text-xs text-red-600 font-medium leading-relaxed">
                  This workout was modified on another device. Your local changes are preserved but cannot be synced safely.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("This will discard any offline changes you made to this session. Continue?")) {
                      discardLocal(id!);
                    }
                  }}
                  className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-200 transition"
                >
                  Discard Local Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {syncState.failed && !syncState.conflict && (
          <div className="mx-4 md:mx-0 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm flex items-start gap-4">
            <AlertTriangle className="mt-0.5 text-amber-500 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800">Sync Pending</p>
              <p className="mt-1 text-xs text-amber-600 font-medium">
                Some changes couldn't reach the server. They are saved locally and will retry.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-8 items-start px-4 md:px-0">
          {/* MAIN WORKOUT LOGGER */}
          <div className="md:col-span-8 space-y-6">
            <div className="bg-[#FFFFFF] border-y border-[#E5E7EB] sm:border sm:rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 sm:py-4 bg-[#111827] text-white flex justify-between items-center">
                <button
                  onClick={saveAndGoPrev}
                  disabled={isFirstExercise}
                  aria-label="Previous exercise"
                  className="p-2 text-white/50 disabled:opacity-30 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="text-center flex-1 px-2">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    Exercise {currentExerciseIndex + 1} of {localSession.exercises.length}
                  </p>
                  <h2 className="text-lg font-bold truncate">
                    {currentExercise.exerciseName}
                  </h2>
                </div>
                <button
                  onClick={saveAndGoNext}
                  disabled={isLastExercise}
                  aria-label="Next exercise"
                  className="p-2 text-white/50 disabled:opacity-30 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {currentExercise.progressionInsight && (
                <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-100 flex items-start gap-3">
                  <Trophy size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-cyan-900 leading-tight">
                    {currentExercise.progressionInsight.reason}
                  </p>
                </div>
              )}

              <div className="p-0">
                <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem] gap-1 px-4 py-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] bg-[#F7F8FA]">
                  <div className="text-center">Set</div>
                  <div>Previous</div>
                  <div className="text-center">kg</div>
                  <div className="text-center">Reps</div>
                  <div className="text-center"><Check size={14} className="mx-auto" /></div>
                </div>

                <div className="flex flex-col divide-y divide-[#E5E7EB]">
                  {activeSets.map((set, idx) => {
                    const previousText = currentExercise.progressionInsight?.previousWeight !== undefined
                      ? `${currentExercise.progressionInsight.previousWeight > 0 ? currentExercise.progressionInsight.previousWeight : 'BW'} × ${currentExercise.progressionInsight.previousReps}`
                      : "—";
                    const isCompleted = set.completed;

                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem] items-center gap-1 px-4 py-2 transition-colors ${isCompleted ? "bg-emerald-50/50" : "bg-[#FFFFFF]"}`}
                      >
                        <div className="text-center font-bold text-[#6B7280] text-sm">
                          {set.setNumber}
                        </div>
                        <div className="text-xs font-medium text-[#9CA3AF] truncate pr-1">
                          {previousText}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.5}
                            value={set.weight}
                            aria-label={`Set ${idx + 1} weight`}
                            onChange={(e) => {
                              e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                              handleUpdateSet(idx, "weight", parseFloat(e.target.value) || 0);
                            }}
                            className={`w-full bg-[#F1F3F5] rounded-xl h-[44px] text-center text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-[#FFFFFF] transition ${isCompleted ? "opacity-50" : ""}`}
                            disabled={isCompleted}
                          />
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={set.reps || ""}
                            aria-label={`Set ${idx + 1} reps`}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(idx, "reps", val === "" ? 0 : parseInt(val) || 0);
                            }}
                            className={`w-full bg-[#F1F3F5] rounded-xl h-[44px] text-center text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-[#FFFFFF] transition ${isCompleted ? "opacity-50" : ""}`}
                            disabled={isCompleted}
                          />
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleComplete(idx)}
                            disabled={updateMutation.isPending}
                            aria-label={`Mark set ${idx + 1} as ${isCompleted ? 'incomplete' : 'complete'}`}
                            className={`flex h-[36px] w-[36px] items-center justify-center rounded-xl transition shadow-sm border ${isCompleted ? "bg-emerald-500 border-emerald-600 text-white" : "bg-[#F7F8FA] border-[#E5E7EB] text-[#9CA3AF] hover:bg-[#F1F3F5]"} ${updateMutation.isPending && updatingSetIdx === idx ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {updateMutation.isPending && updatingSetIdx === idx ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : isCompleted ? (
                              <Check size={20} strokeWidth={3} />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-[#9CA3AF]" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 py-4 border-t border-[#E5E7EB] bg-[#FFFFFF]">
                  <button
                    onClick={handleAddSet}
                    className="w-full rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F7F8FA] py-3 text-sm font-bold text-[#6B7280] hover:bg-[#F1F3F5] hover:text-[#111827] hover:border-[#D1D5DB] transition"
                  >
                    + Add Set
                  </button>
                </div>
              </div>
            </div>

            <RestTimer autoStartTrigger={timerTrigger} />
          </div>

          {/* DESKTOP SIDEBAR OVERVIEW */}
          <div className="hidden md:block md:col-span-4 space-y-6 sticky top-[88px]">
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F7F8FA] flex justify-between items-center">
                <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Workout Overview
                </h3>
              </div>
              
              <div className="px-5 py-4 flex gap-4 bg-[#FFFFFF] border-b border-[#E5E7EB]">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Total Volume</p>
                  <p className="text-xl font-bold text-[#111827]">{totalVolume} kg</p>
                </div>
                <div className="w-px bg-[#E5E7EB]" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Completed Sets</p>
                  <p className="text-xl font-bold text-[#111827]">{totalSets}</p>
                </div>
              </div>

              <div className="divide-y divide-[#E5E7EB]">
                {localSession.exercises.map((ex, idx) => {
                  const exSetsCompleted = ex.sets.filter(s => s.completed).length;
                  const isCurrent = idx === currentExerciseIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        updateMutation.mutate(localSession);
                        setCurrentExerciseIndex(idx);
                      }}
                      className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${isCurrent ? "bg-cyan-50" : "hover:bg-[#F7F8FA]"}`}
                    >
                      <div className="flex flex-col pr-4">
                        <span className={`text-sm font-bold truncate ${isCurrent ? "text-cyan-700" : "text-[#111827]"}`}>
                          {ex.exerciseName}
                        </span>
                        <span className="text-xs font-medium text-[#6B7280] mt-0.5">
                          {ex.plannedSets} Sets
                        </span>
                      </div>
                      <div className={`flex items-center justify-center border rounded-full h-8 px-3 shrink-0 ${isCurrent ? "bg-[#FFFFFF] border-cyan-200" : "bg-[#FFFFFF] border-[#E5E7EB]"}`}>
                        <span className="text-xs font-bold text-[#111827]">
                          {exSetsCompleted} <span className="text-[#9CA3AF]">/ {ex.plannedSets}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E5E7EB] bg-[#FFFFFF]/95 backdrop-blur-md p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-5xl flex justify-between items-center gap-4">
          <div className="hidden md:flex flex-1 items-center gap-6">
             <span className="text-sm font-bold text-[#6B7280] flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-[#F1F3F5] flex items-center justify-center">
                 <Dumbbell size={16} className="text-[#111827]" />
               </div>
               {localSession.exercises.length} Exercises
             </span>
             <span className="text-sm font-bold text-[#6B7280] flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-[#F1F3F5] flex items-center justify-center">
                 <CheckCircle size={16} className="text-[#111827]" />
               </div>
               {totalSets} Sets Completed
             </span>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to finish this workout?")) {
                completeMutation.mutate();
              }
            }}
            disabled={completeMutation.isPending || updateMutation.isPending}
            className="w-full md:w-auto md:min-w-[280px] rounded-2xl bg-cyan-600 py-3.5 px-8 font-bold text-white shadow-sm transition hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-50"
          >
            {completeMutation.isPending ? "Finishing..." : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
