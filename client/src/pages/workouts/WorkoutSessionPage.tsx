import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw, Loader2, AlertTriangle, Clock } from "lucide-react";
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
    <div className="bg-white border-y border-gray-200 sm:border sm:rounded-xl sm:mx-4 mt-4 p-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
          <Clock className="text-gray-500" size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-500 tracking-wider">REST TIMER</span>
          <span className={`text-xl font-bold tabular-nums leading-none mt-0.5 ${timeLeft === 0 ? "text-green-600" : "text-gray-900"}`}>
            {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          aria-label={isActive ? "Pause timer" : "Play timer"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors"
        >
          {isActive ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={resetTimer}
          aria-label="Reset timer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => { setIsActive(false); setEndTime(null); setTimeLeft(defaultSeconds); }}
          aria-label="Dismiss timer"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
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

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900 pb-32 font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-cyan-600 p-1 -ml-1 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center flex-1 px-2">
          <h1 className="text-base font-bold text-gray-900 truncate">
            {typeof localSession.workout === 'object' ? localSession.workout.name : "Workout Session"}
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center justify-center gap-2">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-gray-700">
                <Clock size={10} />
                <WorkoutTimer startedAt={localSession.startedAt} />
              </span>
              <span>Exercise {currentExerciseIndex + 1} of {localSession.exercises.length}</span>
            </p>
        </div>
        <button
          onClick={() => updateMutation.mutate(localSession)}
          className="text-cyan-600 text-sm font-semibold p-1 -mr-1"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving" : "Save"}
        </button>
      </header>

      <div className="mx-auto max-w-md pt-4 space-y-4">
        {syncState.conflict && (
          <div className="mx-4 sm:mx-0 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-500 shrink-0" size={18} />
              <div>
                <p className="text-sm font-semibold text-red-800">Sync Conflict</p>
                <p className="mt-1 text-xs text-red-600 leading-relaxed">
                  This workout was modified on another device. Your local changes are preserved but cannot be synced safely.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm("This will discard any offline changes you made to this session. Continue?")) {
                      discardLocal(id!);
                    }
                  }}
                  className="mt-3 rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition"
                >
                  Discard Local Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {syncState.failed && !syncState.conflict && (
          <div className="mx-4 sm:mx-0 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-500 shrink-0" size={18} />
            <div>
              <p className="text-sm font-semibold text-amber-800">Sync Pending</p>
              <p className="mt-1 text-xs text-amber-600">
                Some changes couldn't reach the server. They are saved locally and will retry.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border-y border-gray-200 sm:border sm:rounded-xl sm:mx-4 shadow-sm">
          <div className="px-4 py-3 flex justify-between items-center bg-[#F1F3F5] sm:rounded-t-xl border-b border-gray-200">
            <button
              onClick={saveAndGoPrev}
              disabled={isFirstExercise}
              aria-label="Previous exercise"
              className="p-1.5 text-gray-400 disabled:opacity-30 hover:text-gray-700 bg-white rounded-md shadow-sm transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center flex-1 px-2">
              <h2 className="text-lg font-bold text-gray-900 truncate uppercase">
                {currentExercise.exerciseName}
              </h2>
              {currentExercise.progressionInsight && (
                <p className="text-[11px] text-gray-500 font-medium mt-0.5 max-w-[200px] mx-auto truncate">
                  {currentExercise.progressionInsight.reason}
                </p>
              )}
            </div>
            <button
              onClick={saveAndGoNext}
              disabled={isLastExercise}
              aria-label="Next exercise"
              className="p-1.5 text-gray-400 disabled:opacity-30 hover:text-gray-700 bg-white rounded-md shadow-sm transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="p-0">
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4rem] gap-1 px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <div className="text-center">Set</div>
              <div>Previous</div>
              <div className="text-center">kg</div>
              <div className="text-center">Reps</div>
              <div className="text-center flex justify-center"><Check size={14} /></div>
            </div>

            <div className="flex flex-col">
              {activeSets.map((set, idx) => {
                const previousText = currentExercise.progressionInsight?.previousWeight !== undefined
                  ? `${currentExercise.progressionInsight.previousWeight > 0 ? currentExercise.progressionInsight.previousWeight : 'BW'} × ${currentExercise.progressionInsight.previousReps}`
                  : "—";

                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[2.5rem_1fr_4rem_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4rem] items-center gap-1 px-4 py-2 transition-colors border-b border-gray-50 last:border-0 ${
                      set.completed ? "bg-green-50/50" : "bg-white"
                    }`}
                  >
                    <div className="text-center font-bold text-gray-500 text-sm">{set.setNumber}</div>

                    <div className="text-xs font-medium text-gray-400 truncate pr-1">
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
                        className={`w-full bg-[#F1F3F5] rounded h-[44px] text-center text-sm font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-cyan-500 transition-opacity ${
                          set.completed ? "opacity-50" : ""
                        }`}
                        disabled={set.completed}
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
                        className={`w-full bg-[#F1F3F5] rounded h-[44px] text-center text-sm font-semibold text-gray-900 outline-none focus:ring-1 focus:ring-cyan-500 transition-opacity ${
                          set.completed ? "opacity-50" : ""
                        }`}
                        disabled={set.completed}
                      />
                    </div>

                    <button
                      onClick={() => handleToggleComplete(idx)}
                      disabled={updateMutation.isPending}
                      aria-label={`Mark set ${idx + 1} as ${set.completed ? 'incomplete' : 'complete'}`}
                      className={`mx-auto flex h-[44px] w-[44px] items-center justify-center rounded-lg transition-colors shadow-sm ${
                        set.completed
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                      } ${updateMutation.isPending && updatingSetIdx === idx ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {updateMutation.isPending && updatingSetIdx === idx ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : set.completed ? (
                        <Check size={20} />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={handleAddSet}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                + Add Set
              </button>
            </div>
          </div>
        </div>

        <RestTimer autoStartTrigger={timerTrigger} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-md p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] z-50">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to finish this workout?")) {
                completeMutation.mutate();
              }
            }}
            disabled={completeMutation.isPending || updateMutation.isPending}
            className="w-full rounded-xl bg-cyan-600 py-3.5 font-bold text-white shadow-sm transition hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-50"
          >
            {completeMutation.isPending ? "Finishing..." : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
