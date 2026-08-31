import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, PieChart, Search, Info } from "lucide-react";
import { 
  getNutritionEntries, 
  getNutritionSummary, 
  createNutritionEntry, 
  updateNutritionEntry, 
  deleteNutritionEntry,
  searchFoods 
} from "../services/nutrition.service";
import Loader from "../components/ui/Loader";
import type { NutritionEntry, NutritionFood } from "../types";

export default function NutritionPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);

  // Form state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<NutritionFood | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("g");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: entries, isLoading: loadingEntries } = useQuery({
    queryKey: ["nutrition", "entries", date],
    queryFn: () => getNutritionEntries(date),
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["nutrition", "summary", date],
    queryFn: () => getNutritionSummary(date),
  });

  // Food Search
  const { data: foodResults } = useQuery({
    queryKey: ["nutrition", "foods", "search", searchQuery],
    queryFn: () => searchFoods(searchQuery),
    enabled: searchQuery.length > 0 && isDropdownOpen,
  });

  const addMutation = useMutation({
    mutationFn: createNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateNutritionEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "summary", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview"] });
    },
  });

  const resetForm = () => {
    setSearchQuery("");
    setSelectedFood(null);
    setQuantity(100);
    setUnit("g");
    setEditingEntry(null);
    setIsFormOpen(false);
    setIsDropdownOpen(false);
  };

  const handleEdit = (entry: NutritionEntry) => {
    setEditingEntry(entry);
    setSearchQuery(entry.foodName);
    setSelectedFood(null); // Force refetch/search if they want to change it
    setQuantity(entry.quantity);
    setUnit(entry.unit);
    setIsFormOpen(true);
    setIsDropdownOpen(false);
  };

  const handleSelectFood = (food: NutritionFood) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    
    // Auto-select natural unit
    if (food.servings && food.servings.length > 0) {
      setUnit(food.servings[0].unit);
      setQuantity(food.servings[0].quantity || 1);
    } else {
      setUnit(food.baseUnit);
      setQuantity(food.baseQuantity);
    }
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date,
      foodName: searchQuery,
      quantity,
      unit,
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
    setDate(d.toISOString().split("T")[0]);
  };

  // Local Macro Preview Calculation
  let preview: any = null;
  if (selectedFood && quantity > 0) {
    const nUnit = unit.toLowerCase();
    const nBase = selectedFood.baseUnit.toLowerCase();
    let multiplier = 0;
    
    let servingEquivalent: number | undefined;
    if (selectedFood.servings && selectedFood.servings.length > 0) {
      const isPlural = nUnit.endsWith('s');
      const singular = isPlural ? nUnit.slice(0, -1) : nUnit;
      const plural = isPlural ? nUnit : nUnit + 's';

      const serving = selectedFood.servings.find(s => {
        const sUnit = s.unit.toLowerCase();
        return sUnit === nUnit || sUnit === singular || sUnit === plural;
      });

      if (serving) {
        servingEquivalent = serving.equivalent;
      }
    }

    if (servingEquivalent !== undefined && (nBase === "g" || nBase === "ml")) {
      multiplier = (quantity * servingEquivalent) / selectedFood.baseQuantity;
    } else if (nUnit === nBase || (nUnit === "pieces" && nBase === "piece") || (nUnit === "piece" && nBase === "pieces") || (nUnit === "serving" && nBase === "servings") || (nUnit === "servings" && nBase === "serving")) {
      multiplier = quantity / selectedFood.baseQuantity;
    } else if (nUnit === "kg" && nBase === "g") {
      multiplier = (quantity * 1000) / selectedFood.baseQuantity;
    } else if (nUnit === "g" && nBase === "kg") {
      multiplier = (quantity / 1000) / selectedFood.baseQuantity;
    } else if (nUnit === "l" && nBase === "ml") {
      multiplier = (quantity * 1000) / selectedFood.baseQuantity;
    } else if (nUnit === "ml" && nBase === "l") {
      multiplier = (quantity / 1000) / selectedFood.baseQuantity;
    }

    if (multiplier > 0) {
      preview = {
        calories: Math.max(0, Math.round(selectedFood.calories * multiplier)),
        protein: Math.max(0, Math.round(selectedFood.protein * multiplier)),
        carbs: Math.max(0, Math.round(selectedFood.carbs * multiplier)),
        fat: Math.max(0, Math.round(selectedFood.fat * multiplier)),
      };
    }
  }

  const StatCard = ({ label, value, unit, color }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
      <span className="text-slate-400 text-sm font-medium mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
    </div>
  );

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
            {date === new Date().toISOString().split("T")[0] ? "Today" : new Date(date).toLocaleDateString()}
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
            
            <div className="grid gap-4 sm:grid-cols-12 mb-6">
              {/* Food Search */}
              <div className="sm:col-span-6 relative">
                <label className="block text-sm text-slate-400 mb-1">Search Food</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-500" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setSelectedFood(null);
                    }} 
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-cyan-500" 
                    placeholder="Search database..." 
                  />
                </div>
                
                {/* Dropdown Results */}
                {isDropdownOpen && searchQuery.length > 0 && foodResults && (
                  <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    {foodResults.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto">
                        {foodResults.map((food, i) => (
                          <li 
                            key={i} 
                            onClick={() => handleSelectFood(food)}
                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-white border-b border-slate-700/50 last:border-0"
                          >
                            <div className="font-medium">{food.name}</div>
                            <div className="text-xs text-slate-400">
                              {food.calories} kcal / {food.baseQuantity}{food.baseUnit}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-400">No foods found. Check spelling.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="sm:col-span-3">
                <label className="block text-sm text-slate-400 mb-1">Quantity</label>
                <input 
                  required 
                  type="number" 
                  min="0.1" 
                  step="0.1" 
                  value={quantity} 
                  onChange={e => setQuantity(Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" 
                />
              </div>

              {/* Unit */}
              <div className="sm:col-span-3">
                <label className="block text-sm text-slate-400 mb-1">Unit</label>
                <input 
                  required 
                  type="text" 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500" 
                  placeholder="e.g. g, piece" 
                />
              </div>
            </div>
            
            {/* Calculated Macros Preview */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 mb-6">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info size={14} /> Calculated Nutrition Preview
              </h4>
              {preview ? (
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Calories</p>
                    <p className="text-lg font-bold text-amber-500">~{preview.calories}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Protein</p>
                    <p className="text-lg font-bold text-cyan-500">~{preview.protein}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Carbs</p>
                    <p className="text-lg font-bold text-blue-500">~{preview.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Fat</p>
                    <p className="text-lg font-bold text-orange-500">~{preview.fat}g</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic text-center py-2">
                  Select a food from the database and enter a valid unit to see macros.
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-300 hover:text-white font-medium">Cancel</button>
              <button disabled={addMutation.isPending || updateMutation.isPending || (addMutation.isError || updateMutation.isError)} type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50">
                {(addMutation.isPending || updateMutation.isPending) ? "Saving..." : (editingEntry ? "Save Changes" : "Save Entry")}
              </button>
            </div>
            {(addMutation.isError || updateMutation.isError) && (
              <p className="text-red-400 text-sm mt-3 text-right">Error saving entry. Verify food name and unit.</p>
            )}
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
