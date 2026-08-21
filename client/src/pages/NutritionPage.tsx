import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, PieChart } from "lucide-react";
import { getNutritionEntries, getNutritionSummary, createNutritionEntry, updateNutritionEntry, deleteNutritionEntry } from "../services/nutrition.service";
import Loader from "../components/ui/Loader";
import type { NutritionEntry } from "../types";

export default function NutritionPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);

  // Form state
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  const queryClient = useQueryClient();

  const { data: entries, isLoading: loadingEntries, isError: errorEntries } = useQuery({
    queryKey: ["nutrition", "entries", date],
    queryFn: () => getNutritionEntries(date),
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["nutrition", "summary", date],
    queryFn: () => getNutritionSummary(date),
  });

  const addMutation = useMutation({
    mutationFn: createNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateNutritionEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
    },
  });

  const resetForm = () => {
    setFoodName("");
    setQuantity(1);
    setUnit("serving");
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setEditingEntry(null);
    setIsFormOpen(false);
  };

  const handleEdit = (entry: NutritionEntry) => {
    setEditingEntry(entry);
    setFoodName(entry.foodName);
    setQuantity(entry.quantity);
    setUnit(entry.unit);
    setCalories(entry.calories);
    setProtein(entry.protein);
    setCarbs(entry.carbs);
    setFat(entry.fat);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date,
      foodName,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
    };
    
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry._id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
  };

  if (errorEntries) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6 text-center">
        <p className="text-red-400">Error loading nutrition data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <PieChart className="text-cyan-500" /> Nutrition Tracker
          </h1>
          <p className="text-slate-400 mt-2">Track your daily food intake and macros.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-2 border border-slate-800">
          <button onClick={() => changeDate(-1)} className="px-3 py-1 text-slate-400 hover:text-white">&lt;</button>
          <span className="text-white font-medium min-w-[100px] text-center">
            {date === new Date().toISOString().split('T')[0] ? "Today" : new Date(date).toLocaleDateString()}
          </span>
          <button onClick={() => changeDate(1)} className="px-3 py-1 text-slate-400 hover:text-white">&gt;</button>
        </div>
      </div>

      {/* Summary Section */}
      {loadingSummary ? (
        <div className="flex justify-center py-10"><Loader /></div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Calories" value={summary.totalCalories} unit="kcal" color="text-amber-500" />
          <StatCard label="Protein" value={summary.totalProtein} unit="g" color="text-cyan-500" />
          <StatCard label="Carbs" value={summary.totalCarbs} unit="g" color="text-blue-500" />
          <StatCard label="Fat" value={summary.totalFat} unit="g" color="text-orange-500" />
        </div>
      ) : null}

      {/* Entries Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Food Log</h2>
          {!isFormOpen && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Plus size={18} /> Add Food
            </button>
          )}
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="mb-8 bg-slate-950 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">{editingEntry ? "Edit Entry" : "Add New Entry"}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Food Name</label>
                <input required type="text" value={foodName} onChange={e => setFoodName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="e.g. Chicken Breast" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                <input required type="number" min="0" step="0.1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Unit</label>
                <input required type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" placeholder="e.g. g, oz, serving" />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Calories (kcal)</label>
                <input required type="number" min="0" value={calories} onChange={e => setCalories(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Protein (g)</label>
                <input required type="number" min="0" step="0.1" value={protein} onChange={e => setProtein(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Carbs (g)</label>
                <input required type="number" min="0" step="0.1" value={carbs} onChange={e => setCarbs(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fat (g)</label>
                <input required type="number" min="0" step="0.1" value={fat} onChange={e => setFat(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-300 hover:text-white font-medium">Cancel</button>
              <button disabled={addMutation.isPending || updateMutation.isPending} type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50">
                {editingEntry ? "Save Changes" : "Save Entry"}
              </button>
            </div>
          </form>
        )}

        {loadingEntries ? (
          <div className="flex justify-center py-10"><Loader /></div>
        ) : entries && entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Food</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Calories</th>
                  <th className="pb-3 font-medium">Macros (P/C/F)</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                    <td className="py-4 text-white font-medium">{entry.foodName}</td>
                    <td className="py-4 text-slate-300">{entry.quantity} {entry.unit}</td>
                    <td className="py-4 text-amber-500 font-semibold">{entry.calories}</td>
                    <td className="py-4 text-slate-300 text-sm">
                      <span className="text-cyan-400">{entry.protein}g</span> / <span className="text-blue-400">{entry.carbs}g</span> / <span className="text-orange-400">{entry.fat}g</span>
                    </td>
                    <td className="py-4 flex justify-end gap-2">
                      <button onClick={() => handleEdit(entry)} className="p-2 text-slate-400 hover:text-cyan-400 transition bg-slate-950 rounded-lg">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(entry._id)} className="p-2 text-slate-400 hover:text-red-400 transition bg-slate-950 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-950 border border-slate-800 mb-4">
              <PieChart className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No food logged yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">Keep track of your nutrition to optimize your performance and recovery.</p>
            {!isFormOpen && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Log First Meal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-sm font-medium text-slate-400 mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${color}`}>{Math.round(value)}</span>
        <span className="text-slate-500 text-sm">{unit}</span>
      </div>
    </div>
  );
}
