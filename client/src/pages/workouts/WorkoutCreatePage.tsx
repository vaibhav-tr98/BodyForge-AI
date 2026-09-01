import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, X, Loader as LoaderIcon } from "lucide-react";
import { createWorkout } from "../../services/workout.service";
import WorkoutForm from "./components/WorkoutForm";
import { api } from "../../services/api";

export default function WorkoutCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAiModal, setShowAiModal] = useState(false);
  
  // AI Generator state
  const [targetMuscles, setTargetMuscles] = useState("Full Body");
  const [availableTime, setAvailableTime] = useState(45);
  const [equipment, setEquipment] = useState("Full Gym");
  
  // Form prefill state
  const [generatedData, setGeneratedData] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: () => {
      toast.success("Workout created successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      navigate("/workouts");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create workout");
    },
  });

  const aiMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/api/analytics/generate-workout-plan", data);
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success("AI generated your workout successfully!");
      setGeneratedData({
        name: data.name,
        description: data.description,
        exercises: data.exercises.map((ex: any) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: 0
        }))
      });
      setShowAiModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to generate workout");
    }
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    aiMutation.mutate({
      targetMuscles,
      availableTime: Number(availableTime),
      equipment
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Create Workout</h1>
          <p className="mt-2 text-slate-400">
            Design a new routine by adding exercises, sets, and reps.
          </p>
        </div>
        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-purple-900/20"
        >
          <Sparkles size={18} />
          Generate with AI
        </button>
      </div>

      <WorkoutForm
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        submitLabel="Create Workout"
        initialData={generatedData}
      />

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-purple-400" size={20} />
                AI Workout Generator
              </h2>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleGenerate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Target Muscles</label>
                <input 
                  type="text" 
                  value={targetMuscles}
                  onChange={e => setTargetMuscles(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Chest & Triceps, Full Body"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Available Time (minutes)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="15" 
                    max="120" 
                    step="15"
                    value={availableTime}
                    onChange={e => setAvailableTime(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <span className="text-white font-medium min-w-[3rem] text-right">{availableTime}m</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Equipment Available</label>
                <select 
                  value={equipment}
                  onChange={e => setEquipment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Full Gym">Full Gym</option>
                  <option value="Dumbbells Only">Dumbbells Only</option>
                  <option value="Bodyweight">Bodyweight / No Equipment</option>
                  <option value="Kettlebells & Bands">Kettlebells & Bands</option>
                  <option value="Home Gym">Home Gym (Basic)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button 
                  type="submit" 
                  disabled={aiMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiMutation.isPending ? (
                    <>
                      <LoaderIcon className="animate-spin" size={18} />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Custom Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
