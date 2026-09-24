import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { getWorkoutSession, updateWorkoutSession, completeWorkoutSession } from "../../services/workoutSession.service";

import { useSessionSyncState, discardLocal } from "../../lib/syncQueue";
import Loader from "../../components/ui/Loader";
import type { SessionSet, WorkoutSession } from "../../types";

function RestTimer({ defaultSeconds = 90, autoStartTrigger = 0 }: { defaultSeconds?: number; autoStartTrigger?: number }) {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isActive, setIsActive] = useState(false);
  
  // When autoStartTrigger changes, start the timer
  useEffect(() => {
    if (autoStartTrigger > 0) {
      setEndTime(Date.now() + defaultSeconds * 1000);
      setTimeLeft(defaultSeconds);
      setIsActive(true);
    }
  }, [autoStartTrigger, defaultSeconds]);

  // Tick the timer based on the delta to endTime
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && endTime !== null) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsActive(false);
          setEndTime(null);
        }
      }, 100); // Check more frequently to keep UI responsive, but calculate exact remaining time
    }
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  const toggleTimer = () => {
    if (isActive) {
      // Pause
      setIsActive(false);
      setEndTime(null);
    } else {
      // Resume
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-sm font-medium text-slate-400">REST TIMER</div>
      <div className={`my-2 text-4xl font-bold tabular-nums ${timeLeft === 0 ? "text-green-400" : "text-white"}`}>
        {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
      </div>
      <div className="flex gap-4">
        <button
          onClick={toggleTimer}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-cyan-400 hover:bg-slate-700"
        >
          {isActive ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={resetTimer}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700"
        >
          <RotateCcw size={20} />
        </button>
        <button
          onClick={() => { setIsActive(false); setEndTime(null); setTimeLeft(0); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700"
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
    },
    onError: async (err: any, data: WorkoutSession) => {
      const isAxiosNetwork = err.isAxiosError && (!err.response || err.response.status >= 500 || err.response.status === 429);
      const isNetworkError = !navigator.onLine || err.message === "offline" || isAxiosNetwork;
      if (isNetworkError) {
        toast.success("Saved offline", { id: "offline-save", duration: 2000 });
        const { enqueueUpdateMutation } = await import("../../lib/syncQueue");
        // We need userId here. The session object doesn't directly have the string userId unless populated,
        // but we can extract it from AuthContext or rely on the auth interceptor.
        // Wait, localSession.user might be an ID or object, or we can get it from another context.
        // For simplicity, let's just pass `typeof data.user === 'string' ? data.user : (data as any).user?._id || "unknown"`
        // Actually, let's fix user extraction down below.
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
      const isAxiosNetwork = err.isAxiosError && (!err.response || err.response.status >= 500 || err.response.status === 429);
      const isNetworkError = !navigator.onLine || err.message === "offline" || isAxiosNetwork;
      if (isNetworkError && localSession) {
        toast.success("Workout completed offline. It will sync when reconnected.");
        const { enqueueCompleteMutation } = await import("../../lib/syncQueue");
        const userId = typeof (localSession as any).user === 'string' ? (localSession as any).user : (localSession as any).user?._id || "unknown";
        await enqueueCompleteMutation(userId, id!, localSession.updatedAt);
        navigate("/workouts/history");
      } else {
        toast.error("Failed to complete workout");
      }
    }
  });


  if (isLoading || !localSession) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load workout session. Please try again.
      </div>
    );
  }

  const currentExercise = localSession.exercises[currentExerciseIndex];
  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise = currentExerciseIndex === localSession.exercises.length - 1;

  // Make sure we have enough sets array elements initialized based on planned sets or current sets
  const activeSets = currentExercise.sets.length > 0 ? currentExercise.sets : 
    Array.from({ length: currentExercise.plannedSets }).map((_, i) => ({
      setNumber: i + 1,
      weight: currentExercise.plannedWeight || 0,
      reps: currentExercise.plannedReps,
      completed: false
    }));

  if (currentExercise.sets.length === 0) {
    currentExercise.sets = activeSets;
  }

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
    ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: finalValue };
    setLocalSession(newSession);
  };

  const isTogglingRef = useRef(false);

  const handleToggleComplete = (setIdx: number) => {
    if (updateMutation.isPending || isTogglingRef.current) return;
    isTogglingRef.current = true;

    const newSession = { ...localSession };
    const ex = newSession.exercises[currentExerciseIndex];
    const isNowCompleted = !ex.sets[setIdx].completed;
    ex.sets[setIdx].completed = isNowCompleted;
    setLocalSession(newSession);
    setUpdatingSetIdx(setIdx);
    // Start timer immediately!
    if (isNowCompleted) {
      setTimerTrigger(Date.now());
    }
    
    // Auto-save on toggle complete in background
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
    <div className="mx-auto max-w-md space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white truncate pr-4">
          {typeof localSession.workout === 'object' ? localSession.workout.name : "Workout Session"}
        </h1>
        <button 
          onClick={() => updateMutation.mutate(localSession)}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {syncState.conflict && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-red-400 shrink-0" size={18} />
            <div>
              <p className="text-sm font-semibold text-red-200">Sync Conflict</p>
              <p className="mt-1 text-xs text-red-300/90 leading-relaxed">
                This workout was modified on another device. Your local changes are preserved but cannot be synced safely.
              </p>
              <button 
                onClick={() => {
                  if (window.confirm("This will discard any offline changes you made to this session. Continue?")) {
                    discardLocal(id!);
                  }
                }}
                className="mt-3 rounded bg-red-900/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 transition"
              >
                Discard Local Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {syncState.failed && !syncState.conflict && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-amber-400 shrink-0" size={18} />
          <div>
            <p className="text-sm font-semibold text-amber-200">Sync Pending</p>
            <p className="mt-1 text-xs text-amber-300/90">
              Some changes couldn't reach the server. They are saved locally and will retry.
            </p>
          </div>
        </div>
      )}

      {/* Exercise Navigation & Headline */}
      <div className="rounded-xl bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={saveAndGoPrev}
            disabled={isFirstExercise}
            className="p-2 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center px-2">
            <div className="text-sm font-medium tracking-wide text-cyan-400">
              Exercise {currentExerciseIndex + 1} of {localSession.exercises.length}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-2 uppercase break-words">
              {currentExercise.exerciseName}
            </div>
          </div>
          <button
            onClick={saveAndGoNext}
            disabled={isLastExercise}
            className="p-2 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        <div className="text-center text-slate-300 font-medium">
          <p>Focus on this exercise.</p>
          <p>Complete your sets before moving on.</p>
        </div>
      </div>

      {/* Progression Section */}
      {currentExercise.progressionInsight ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-5">
            <div className="mb-2 flex items-center justify-center gap-2 text-sm font-bold tracking-wider text-cyan-400">
              <span>🎯 TODAY'S TARGET</span>
            </div>
            <div className="text-center text-2xl font-bold text-white">
              {currentExercise.plannedWeight !== undefined && currentExercise.plannedWeight > 0 ? `${currentExercise.plannedWeight} kg` : 'Bodyweight'} &times; {currentExercise.plannedReps}
            </div>
            
            <div className="mt-4 border-t border-cyan-900/30 pt-4">
              <div className="text-center text-xs font-bold tracking-wider text-slate-500 mb-1">WHY?</div>
              <p className="text-center text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                {currentExercise.progressionInsight.reason}
              </p>
            </div>
          </div>
          
          {currentExercise.progressionInsight.previousWeight !== undefined && currentExercise.progressionInsight.previousReps !== undefined && (
            <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-800">
              <div className="text-center text-xs font-bold tracking-wider text-slate-500 mb-2">LAST SESSION</div>
              <div className="text-center font-medium text-slate-300">
                <span className="text-white font-bold mr-2">
                  {currentExercise.progressionInsight.previousWeight > 0 ? `${currentExercise.progressionInsight.previousWeight} kg` : 'Bodyweight'}
                </span>
                <span className="text-slate-400">
                  &times; {currentExercise.progressionInsight.previousReps}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Sets Tracker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-4 grid grid-cols-[3rem_1fr_1fr_4rem] gap-2 text-center text-xs font-medium text-slate-400">
          <div>SET</div>
          <div>KG</div>
          <div>REPS</div>
          <div>DONE</div>
        </div>
        
        <div className="space-y-3">
          {activeSets.map((set, idx) => (
            <div 
              key={idx} 
              className={`grid grid-cols-[3rem_1fr_1fr_4rem] items-center gap-2 rounded-lg p-2 transition-colors ${
                set.completed ? "bg-cyan-950/30" : ""
              }`}
            >
              <div className="text-center font-bold text-slate-500">{set.setNumber}</div>
              
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={set.weight}
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                    handleUpdateSet(idx, "weight", parseFloat(e.target.value) || 0);
                  }}
                  className={`w-full rounded bg-slate-800 py-3 text-center font-semibold text-white outline-none focus:ring-2 focus:ring-cyan-500 ${
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
                  value={set.reps}
                  onChange={(e) => handleUpdateSet(idx, "reps", parseInt(e.target.value) || 0)}
                  className={`w-full rounded bg-slate-800 py-3 text-center font-semibold text-white outline-none focus:ring-2 focus:ring-cyan-500 ${
                    set.completed ? "opacity-50" : ""
                  }`}
                  disabled={set.completed}
                />
              </div>

              <button
                onClick={() => handleToggleComplete(idx)}
                disabled={updateMutation.isPending}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  set.completed 
                    ? "bg-cyan-500 text-white" 
                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                } ${updateMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {updateMutation.isPending && updatingSetIdx === idx ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : set.completed ? (
                  <Check size={20} />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-400" />
                )}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddSet}
          className="mt-6 w-full rounded-lg border border-dashed border-slate-700 py-3 text-sm font-medium text-slate-400 hover:border-slate-500 hover:text-slate-300"
        >
          + Add Set
        </button>
      </div>

      <RestTimer autoStartTrigger={timerTrigger} />

      {/* Complete Workout Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to finish this workout?")) {
                completeMutation.mutate();
              }
            }}
            disabled={completeMutation.isPending}
            className="w-full rounded-xl bg-cyan-600 py-4 font-bold text-white shadow-lg shadow-cyan-900/20 transition hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-50"
          >
            {completeMutation.isPending ? "Finishing..." : "Finish Workout"}
          </button>
        </div>
      </div>
    </div>
  );
}
