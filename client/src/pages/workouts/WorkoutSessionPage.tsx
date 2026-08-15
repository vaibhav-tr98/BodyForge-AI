import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import { getWorkoutSession, updateWorkoutSession, completeWorkoutSession } from "../../services/workoutSession.service";
import Loader from "../../components/ui/Loader";
import type { SessionSet, WorkoutSession } from "../../types";

// Rest Timer Component
function RestTimer({ defaultSeconds = 90, autoStartTrigger = 0 }: { defaultSeconds?: number; autoStartTrigger?: number }) {
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    if (autoStartTrigger > 0) {
      setTimeLeft(defaultSeconds);
      setIsActive(true);
    }
  }, [autoStartTrigger, defaultSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
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
          onClick={() => { setIsActive(false); setTimeLeft(0); }}
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
    mutationFn: (data: WorkoutSession) => updateWorkoutSession(data.id, { exercises: data.exercises }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutSession", id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeWorkoutSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutSessions"] });
      queryClient.invalidateQueries({ queryKey: ["workoutSession", id] });
      queryClient.invalidateQueries({ queryKey: ["activeWorkout"] });
      navigate("/workouts/history");
    },
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

  const handleToggleComplete = (setIdx: number) => {
    if (updateMutation.isPending) return;

    const newSession = { ...localSession };
    const ex = newSession.exercises[currentExerciseIndex];
    const isNowCompleted = !ex.sets[setIdx].completed;
    ex.sets[setIdx].completed = isNowCompleted;
    setLocalSession(newSession);
    setUpdatingSetIdx(setIdx);
    
    // Auto-save on toggle complete
    updateMutation.mutate(newSession, {
      onSuccess: () => {
        if (isNowCompleted) {
          setTimerTrigger(Date.now());
        }
      },
      onSettled: () => {
        setUpdatingSetIdx(null);
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
                  onChange={(e) => handleUpdateSet(idx, "weight", parseFloat(e.target.value) || 0)}
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
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950 p-4 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
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
