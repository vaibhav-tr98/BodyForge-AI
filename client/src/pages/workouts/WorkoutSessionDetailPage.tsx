import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, Check, Dumbbell, Weight, Trophy } from "lucide-react";
import { getWorkoutSession } from "../../services/workoutSession.service";
import Loader from "../../components/ui/Loader";

export default function WorkoutSessionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ["workoutSession", id],
    queryFn: () => getWorkoutSession(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-4">Failed to load workout session.</p>
          <Link
            to="/workouts/history"
            className="text-cyan-600 font-semibold hover:underline"
          >
            Return to History
          </Link>
        </div>
      </div>
    );
  }

  const durationMins = session.completedAt 
    ? Math.max(1, Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    : null;

  const totalVolume = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).reduce((sum, s) => sum + (s.weight * s.reps), 0), 0);
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
  const totalExercises = session.exercises.length;

  const workoutName = typeof session.workout === 'object' ? session.workout.name : "Workout Session";
  const dateFormatted = new Date(session.startedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] pb-32 font-sans">
      <header className="bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 py-3 sticky top-0 z-10 flex items-center shadow-sm">
        <Link
          to="/workouts/history"
          aria-label="Go back"
          className="text-[#6B7280] p-2 -ml-2 hover:bg-[#F7F8FA] rounded-full transition"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-base font-bold truncate flex-1 ml-2">Workout Details</h1>
      </header>

      <div className="mx-auto max-w-5xl px-4 md:px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* MAIN COLUMN */}
          <div className="md:col-span-8 space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#111827]">
                    {workoutName}
                  </h1>
                  <p className="text-sm font-medium text-[#6B7280] mt-1.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-cyan-600" />
                    {dateFormatted}
                  </p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {session.status}
                </div>
              </div>
            </div>

            {/* Mobile Summary */}
            <div className="md:hidden bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <h2 className="px-5 py-3.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider bg-[#F7F8FA] border-b border-[#E5E7EB]">
                Workout Summary
              </h2>
              <div className="grid grid-cols-2 divide-x divide-y divide-[#E5E7EB]">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[#6B7280] mb-1">
                    <Clock size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Duration</p>
                  </div>
                  <p className="text-lg font-bold text-[#111827]">{durationMins ? `${durationMins} min` : "—"}</p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[#6B7280] mb-1">
                    <Weight size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Volume</p>
                  </div>
                  <p className="text-lg font-bold text-[#111827]">{totalVolume.toLocaleString()} kg</p>
                </div>
                <div className="p-4 text-center border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-center gap-1.5 text-[#6B7280] mb-1">
                    <Check size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Sets</p>
                  </div>
                  <p className="text-lg font-bold text-[#111827]">{totalSets}</p>
                </div>
                <div className="p-4 text-center border-t border-[#E5E7EB]">
                  <div className="flex items-center justify-center gap-1.5 text-[#6B7280] mb-1">
                    <Dumbbell size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Exercises</p>
                  </div>
                  <p className="text-lg font-bold text-[#111827]">{totalExercises}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {session.exercises.map((exercise, index) => (
                <div key={index} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-[#F1F3F5] border-b border-[#E5E7EB]">
                    <h3 className="text-lg font-bold text-[#111827]">
                      {index + 1}. {exercise.exerciseName}
                    </h3>
                  </div>

                  {exercise.progressionInsight && (
                    <div className="px-5 py-3 bg-cyan-50 border-b border-cyan-100 flex items-start gap-3">
                      <Trophy size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-cyan-900 leading-tight">
                        {exercise.progressionInsight.reason}
                      </p>
                    </div>
                  )}
                  
                  <div className="p-0">
                    <div className="grid grid-cols-[3rem_1fr_4rem_4rem_4rem] sm:grid-cols-[4rem_1fr_5rem_5rem_5rem] gap-2 px-5 py-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] bg-[#F7F8FA]">
                      <div className="text-center">Set</div>
                      <div></div>
                      <div className="text-center">kg</div>
                      <div className="text-center">Reps</div>
                      <div className="text-center"><Check size={14} className="mx-auto" /></div>
                    </div>

                    <div className="flex flex-col divide-y divide-[#E5E7EB]">
                      {exercise.sets.map((set, setIdx) => (
                        <div 
                          key={setIdx} 
                          className={`grid grid-cols-[3rem_1fr_4rem_4rem_4rem] sm:grid-cols-[4rem_1fr_5rem_5rem_5rem] items-center gap-2 px-5 py-3 ${
                            set.completed ? "bg-[#FFFFFF]" : "bg-[#F7F8FA] opacity-60"
                          }`}
                        >
                          <div className="text-center font-bold text-[#6B7280] text-sm">
                            {set.setNumber}
                          </div>
                          <div></div>
                          <div className={`text-center text-sm font-semibold ${set.completed ? "text-[#111827]" : "text-[#9CA3AF] line-through"}`}>
                            {set.weight}
                          </div>
                          <div className={`text-center text-sm font-semibold ${set.completed ? "text-[#111827]" : "text-[#9CA3AF] line-through"}`}>
                            {set.reps}
                          </div>
                          <div className="flex justify-center">
                            {set.completed ? (
                              <Check size={20} strokeWidth={3} className="text-emerald-500" />
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Skip</span>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {exercise.sets.length === 0 && (
                        <div className="px-5 py-4 text-center text-sm font-medium text-[#9CA3AF]">
                          No sets logged.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DESKTOP SIDEBAR */}
          <div className="hidden md:block md:col-span-4 space-y-6 sticky top-24">
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <h2 className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider bg-[#F7F8FA] border-b border-[#E5E7EB]">
                Workout Summary
              </h2>
              <div className="divide-y divide-[#E5E7EB]">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 text-[#6B7280]">
                    <Clock size={18} />
                    <span className="text-sm font-bold">Duration</span>
                  </div>
                  <span className="text-base font-bold text-[#111827]">
                    {durationMins ? `${durationMins} min` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 text-[#6B7280]">
                    <Weight size={18} />
                    <span className="text-sm font-bold">Volume</span>
                  </div>
                  <span className="text-base font-bold text-[#111827]">
                    {totalVolume.toLocaleString()} kg
                  </span>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 text-[#6B7280]">
                    <Check size={18} />
                    <span className="text-sm font-bold">Sets</span>
                  </div>
                  <span className="text-base font-bold text-[#111827]">
                    {totalSets}
                  </span>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3 text-[#6B7280]">
                    <Dumbbell size={18} />
                    <span className="text-sm font-bold">Exercises</span>
                  </div>
                  <span className="text-base font-bold text-[#111827]">
                    {totalExercises}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
