import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Utensils, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { getTodayOverview } from "../../services/nutrition.service";

const getLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function NutritionTodaySection() {
  const localDate = getLocalDate();
  
  const { data: overview, isLoading, isError } = useQuery({
    queryKey: ["nutrition", "today-overview", localDate],
    queryFn: () => getTodayOverview(localDate),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-cyan-500" size={20} />
          NUTRITION TODAY
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center animate-pulse h-[200px]">
          <div className="h-6 w-32 bg-slate-800 rounded mx-auto mb-4"></div>
        </div>
      </section>
    );
  }

  if (isError || !overview) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-cyan-500" size={20} />
          NUTRITION TODAY
        </h2>
        <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-6 text-center">
          <p className="text-red-400">Nutrition data is currently unavailable.</p>
        </div>
      </section>
    );
  }

  const { nutrition, targets, progress, workout, status } = overview;
  
  const hasNutritionLogs = nutrition.calories > 0 || nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0;
  
  if (!hasNutritionLogs && !workout.hasWorkout && !targets) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-cyan-500" size={20} />
          NUTRITION TODAY
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-400">Complete your profile to set personalized nutrition targets.</p>
          <Link to="/profile" className="mt-4 inline-block text-cyan-500 hover:text-cyan-400 font-medium">Complete Profile</Link>
        </div>
      </section>
    );
  }
  
  if (!hasNutritionLogs && !workout.hasWorkout && targets) {
    return (
      <section>
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-cyan-500" size={20} />
          NUTRITION TODAY
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-400">No nutrition logged today.</p>
        </div>
      </section>
    );
  }

  const getStatusIcon = (st: string) => {
    if (st === "target_reached") return <CheckCircle size={16} className="text-green-500" />;
    if (st === "on_track") return <CheckCircle size={16} className="text-cyan-500" />;
    if (st === "no_target") return <Info size={16} className="text-slate-400" />;
    return <AlertTriangle size={16} className="text-amber-500" />;
  };

  const getStatusText = (type: string, st: string) => {
    if (st === "target_reached") return `${type} target reached`;
    if (st === "on_track") return `${type} on track`;
    if (st === "no_target") return `No target set`;
    return `${type} below target`;
  };

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
        <Utensils className="text-cyan-500" size={20} />
        NUTRITION TODAY
      </h2>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-start">
          
          {/* Calories */}
          <div className="space-y-2 lg:col-span-1">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-white">Calories</span>
              <span className="text-sm font-bold text-cyan-400">
                {nutrition.calories.toLocaleString()} {targets ? `/ ${targets.calories.toLocaleString()} kcal` : "kcal"}
              </span>
            </div>
            {targets && progress ? (
              <>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress.caloriesPercent}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {progress.caloriesPercent}%
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 italic mt-1">Target not set</div>
            )}
          </div>

          {/* Protein */}
          <div className="space-y-2 lg:col-span-1">
            <div className="flex justify-between items-end">
              <span className="font-semibold text-white">Protein</span>
              <span className="text-sm font-bold text-cyan-400">
                {nutrition.protein.toLocaleString()} {targets ? `/ ${targets.protein.toLocaleString()} g` : "g"}
              </span>
            </div>
            {targets && progress ? (
              <>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress.proteinPercent}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {progress.proteinPercent}%
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 italic mt-1">Target not set</div>
            )}
          </div>

          {/* Macros (Carbs & Fat) & Workout Context */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="space-y-3 pl-0 md:pl-4 md:border-l border-slate-800">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Carbs</p>
                <p className="font-semibold text-white">{nutrition.carbs} g</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Fat</p>
                <p className="font-semibold text-white">{nutrition.fat} g</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Today's Training</p>
                <p className="font-semibold text-white truncate">
                  {workout.hasWorkout ? workout.workoutName : "No workout scheduled"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nutrition Status</p>
                <div className="space-y-1">
                  {!targets ? (
                    <div className="flex flex-col gap-1.5 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Info size={14} />
                        <span>Complete your profile to set personalized nutrition targets.</span>
                      </div>
                      <Link to="/profile" className="text-cyan-500 hover:text-cyan-400 font-medium ml-5">
                        Complete Profile
                      </Link>
                    </div>
                  ) : !hasNutritionLogs ? (
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <AlertTriangle size={14} />
                      <span>No nutrition logged</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        {getStatusIcon(status.protein)}
                        <span>{getStatusText("Protein", status.protein)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        {getStatusIcon(status.calories)}
                        <span>{getStatusText("Calories", status.calories)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
