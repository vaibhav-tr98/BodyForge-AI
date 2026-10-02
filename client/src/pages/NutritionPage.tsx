import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PieChart, Search, Edit2, Trash2, Plus, Info, AlertTriangle, Target, Activity } from "lucide-react";
import {
  getNutritionEntries,
  getTodayOverview,
  createNutritionEntry,
  updateNutritionEntry,
  deleteNutritionEntry,
  searchFoods
} from "../services/nutrition.service";
import NaturalLanguageLogger from "../components/nutrition/NaturalLanguageLogger";
import type { NutritionEntry, NutritionFood } from "../types";

// Format date nicely (e.g. Today, Yesterday, Sep 12)
function formatFriendlyDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay.getTime() === today.getTime()) return "Today";
  if (dDay.getTime() === yesterday.getTime()) return "Yesterday";

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined };
  return new Intl.DateTimeFormat(undefined, options).format(d);
}

function MacroBar({ label, consumed, target, color }: { label: string, consumed: number, target?: number, color: string }) {
  const percentage = target && target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm font-medium mb-1.5">
        <span className="text-[#111827]">{label}</span>
        <span className="text-[#6B7280]">
          <span className="text-[#111827] font-bold">{consumed}g</span>
          {target && target > 0 ? ` / ${target}g` : ''}
        </span>
      </div>
      <div className="h-2 w-full bg-[#F1F3F5] rounded-full overflow-hidden">
        {target && target > 0 ? (
          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
        ) : (
          <div className={`h-full ${color} opacity-30 rounded-full transition-all duration-500`} style={{ width: '100%' }} />
        )}
      </div>
    </div>
  );
}

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
  const [quantityError, setQuantityError] = useState("");

  const isMeasurementUnit = (u: string) => {
    return ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'cup', 'cups', 'tbsp', 'tsp', 'fl oz'].includes(u.toLowerCase());
  };

  const queryClient = useQueryClient();

  const { data: overview, isLoading: loadingOverview, isError: errorOverview, refetch: refetchOverview } = useQuery({
    queryKey: ["nutrition", "today-overview", date],
    queryFn: () => getTodayOverview(date),
  });

  const { data: entries, isLoading: loadingEntries, isError: errorEntries, refetch: refetchEntries } = useQuery({
    queryKey: ["nutrition", "entries", date],
    queryFn: () => getNutritionEntries(date),
  });

  const { data: foodResults } = useQuery({
    queryKey: ["nutrition", "foods", "search", searchQuery],
    queryFn: () => searchFoods(searchQuery),
    enabled: searchQuery.length > 0 && isDropdownOpen,
  });

  const addMutation = useMutation({
    mutationFn: createNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview", date] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateNutritionEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview", date] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNutritionEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", "entries", date] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today-overview", date] });
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
    setQuantityError("");
  };

  const handleEdit = (entry: NutritionEntry) => {
    setEditingEntry(entry);
    setSearchQuery(entry.foodName);
    setSelectedFood(null);
    setQuantity(entry.quantity);
    setUnit(entry.unit);
    setIsFormOpen(true);
    setIsDropdownOpen(false);
    setQuantityError("");
  };

  const handleSelectFood = (food: NutritionFood) => {
    setSelectedFood(food);
    setSearchQuery(food.name);

    if (food.servings && food.servings.length > 0) {
      setUnit(food.servings[0].unit);
      setQuantity(food.servings[0].quantity || 1);
    } else {
      setUnit(food.baseUnit);
      setQuantity(food.baseQuantity);
    }
    setIsDropdownOpen(false);
    setQuantityError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMeasurementUnit(unit) && !Number.isInteger(quantity)) {
      setQuantityError(`Quantity for "${unit}" must be a whole number.`);
      return;
    }
    setQuantityError("");

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
    let multiplier = 0;
    if (isMeasurementUnit(unit)) {
      multiplier = quantity / selectedFood.baseQuantity;
    } else {
      const serving = selectedFood.servings?.find(s => s.unit.toLowerCase() === unit.toLowerCase());
      if (serving) {
        multiplier = (quantity / serving.quantity) * (serving.equivalent / selectedFood.baseQuantity);
      }
    }

    if (multiplier > 0) {
      preview = {
        calories: Math.round(selectedFood.calories * multiplier),
        protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
      };
    }
  }

  // Derived values for presentation
  const consumedCals = overview?.nutrition?.calories || 0;
  const targetCals = overview?.targets?.calories || 0;

  // React #310 Safety: Loading & Error states happen AFTER all hooks.
  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <header className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] uppercase tracking-wide">Nutrition</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-1">
            Track your daily fuel
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg p-1 shadow-sm w-fit">
          <button onClick={() => changeDate(-1)} className="p-2 text-[#6B7280] hover:text-[#111827] transition hover:bg-[#F1F3F5] rounded-md">
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 py-1 font-bold text-[#111827] min-w-[100px] text-center">
            {formatFriendlyDate(date)}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 text-[#6B7280] hover:text-[#111827] transition hover:bg-[#F1F3F5] rounded-md">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Global Errors */}
      {(errorOverview || errorEntries) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <h3 className="text-base font-bold text-[#111827] mb-2">Unable to load nutrition data</h3>
          <p className="text-sm text-[#6B7280] mb-5">
            There was a problem retrieving your daily summary.
          </p>
          <button
            onClick={() => { refetchOverview(); refetchEntries(); }}
            className="inline-flex items-center justify-center rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] px-4 py-2 font-semibold text-[#111827] transition hover:bg-[#F1F3F5] shadow-sm min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Left Column - Summary & Meals */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">

          {/* Calorie & Macro Summary */}
          {loadingOverview ? (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm animate-pulse min-h-[160px]" />
          ) : overview ? (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-6 sm:items-center">
              {/* Calorie Ring Area */}
              <div className="flex-1 flex flex-col items-center sm:items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="text-amber-500" size={20} />
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Calories</h3>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-bold text-[#111827]">{consumedCals.toLocaleString()}</span>
                  {targetCals > 0 && (
                    <span className="text-lg font-medium text-[#6B7280]">/ {targetCals.toLocaleString()} kcal</span>
                  )}
                </div>
                {targetCals > 0 && (
                  <div className="mt-3 text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-flex items-center gap-1.5 border border-amber-100">
                    <Target size={14} />
                    {Math.max(0, targetCals - consumedCals).toLocaleString()} kcal remaining
                  </div>
                )}
              </div>

              {/* Macros Area */}
              <div className="flex-1 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-5 sm:pt-0 sm:pl-6 space-y-4">
                <MacroBar label="Protein" consumed={overview.nutrition.protein} target={overview.targets?.protein} color="bg-cyan-500" />
                <MacroBar label="Carbs" consumed={overview.nutrition.carbs} color="bg-blue-500" />
                <MacroBar label="Fat" consumed={overview.nutrition.fat} color="bg-orange-500" />
              </div>
            </div>
          ) : null}

          {/* Meals Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#111827] uppercase tracking-wide flex items-center gap-2">
                Today's Log
              </h2>
            </div>

            {/* Manual Entry Form */}
            {isFormOpen && (
              <form onSubmit={handleSubmit} className="mb-6 bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E7EB] shadow-sm relative overflow-visible z-20">
                <h3 className="text-base font-bold text-[#111827] mb-4">
                  {editingEntry ? "Edit Entry" : "Manual Log"}
                </h3>

                <div className="grid gap-4 sm:grid-cols-12 mb-5">
                  <div className="sm:col-span-6 relative">
                    <label className="block text-sm font-bold text-[#111827] mb-1.5">Food Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-[#6B7280]" />
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
                        className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                        placeholder="Search database..."
                      />
                    </div>

                    {isDropdownOpen && searchQuery.length > 0 && foodResults && (
                      <div className="absolute z-50 mt-1 w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl shadow-xl overflow-hidden">
                        {foodResults.length > 0 ? (
                          <ul className="max-h-60 overflow-y-auto">
                            {foodResults.map((food, i) => (
                              <li
                                key={i}
                                onClick={() => handleSelectFood(food)}
                                className="px-4 py-3 hover:bg-[#F7F8FA] cursor-pointer text-[#111827] border-b border-[#E5E7EB] last:border-0 transition"
                              >
                                <div className="font-bold">{food.name}</div>
                                <div className="text-xs text-[#6B7280] font-medium mt-0.5">
                                  {food.calories} kcal / {food.baseQuantity}{food.baseUnit}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="px-4 py-4 text-sm text-[#6B7280] text-center font-medium">No foods found.</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-bold text-[#111827] mb-1.5">Quantity</label>
                    <input
                      required
                      type="number"
                      min="0.1"
                      step="any"
                      value={quantity}
                      onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-[#F7F8FA] border ${quantityError ? 'border-red-500' : 'border-[#E5E7EB]'} rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]`}
                    />
                    {quantityError && <p className="text-red-500 text-xs mt-1 font-medium">{quantityError}</p>}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-bold text-[#111827] mb-1.5">Unit</label>
                    <input
                      required
                      type="text"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-medium focus:outline-none focus:border-cyan-500 focus:bg-[#FFFFFF] transition min-h-[44px]"
                      placeholder="e.g. g, piece"
                    />
                  </div>
                </div>

                {preview && (
                  <div className="bg-[#F7F8FA] rounded-xl p-4 border border-[#E5E7EB] mb-5">
                    <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Info size={14} /> Nutrition Preview
                    </h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-[#6B7280] mb-1 font-medium">Calories</p>
                        <p className="text-base font-bold text-[#111827]">~{preview.calories}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] mb-1 font-medium">Protein</p>
                        <p className="text-base font-bold text-cyan-600">~{preview.protein}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] mb-1 font-medium">Carbs</p>
                        <p className="text-base font-bold text-blue-600">~{preview.carbs}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] mb-1 font-medium">Fat</p>
                        <p className="text-base font-bold text-orange-500">~{preview.fat}g</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-2">
                  <button type="button" onClick={resetForm} className="px-6 py-2.5 text-[#6B7280] hover:text-[#111827] font-bold rounded-xl hover:bg-[#F1F3F5] transition min-h-[44px]">
                    Cancel
                  </button>
                  <button
                    disabled={addMutation.isPending || updateMutation.isPending || !!quantityError}
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl font-bold transition disabled:opacity-50 min-h-[44px] flex items-center justify-center min-w-[120px]"
                  >
                    {(addMutation.isPending || updateMutation.isPending) ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (editingEntry ? "Save Changes" : "Save Entry")}
                  </button>
                </div>
                {(addMutation.isError || updateMutation.isError) && (
                  <p className="text-red-500 text-sm mt-3 text-right font-medium">Error saving entry. Please verify food name and unit.</p>
                )}
              </form>
            )}

            {/* Entries List */}
            {loadingEntries ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-sm animate-pulse min-h-[100px]" />
                ))}
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="grid gap-4">
                {entries.map(entry => (
                  <div key={entry._id} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 shadow-sm transition hover:border-cyan-500 hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-2">
                        <h4 className="text-[#111827] font-bold text-lg leading-tight capitalize">{entry.foodName}</h4>
                        <p className="text-[#6B7280] text-sm mt-1 font-medium">{entry.quantity} {entry.unit}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button aria-label="Edit entry" onClick={() => handleEdit(entry)} className="p-2 text-[#6B7280] hover:text-cyan-600 transition bg-[#F1F3F5] hover:bg-[#E5E7EB] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Edit2 size={18} />
                        </button>
                        <button aria-label="Delete entry" onClick={() => deleteMutation.mutate(entry._id)} className="p-2 text-[#6B7280] hover:text-red-500 transition bg-[#F1F3F5] hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-[#E5E7EB] gap-2">
                      <div className="text-[#111827] font-bold bg-[#F1F3F5] px-3 py-1 rounded-lg">
                        {entry.calories} kcal
                      </div>
                      <div className="flex gap-3 text-sm font-bold">
                        <span className="text-cyan-600">P {entry.protein}g</span>
                        <span className="text-blue-600">C {entry.carbs}g</span>
                        <span className="text-orange-500">F {entry.fat}g</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-sm px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F1F3F5] mb-4">
                  <PieChart className="text-[#6B7280]" size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#111827] mb-2 uppercase tracking-wide">No food logged yet</h3>
                <p className="text-[#6B7280] mb-8 max-w-sm mx-auto font-medium text-sm">
                  Start tracking your nutrition to hit your daily goals and optimize your performance.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Log & Goals */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6 md:sticky md:top-6">
          <NaturalLanguageLogger date={date} />

          {!isFormOpen && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#FFFFFF] hover:bg-[#F7F8FA] border border-[#E5E7EB] text-[#111827] px-6 py-4 rounded-2xl font-bold transition shadow-sm min-h-[44px] text-base"
            >
              <Plus size={20} />
              Log Manually
            </button>
          )}

          {/* Goals/Insights Box if we want one */}
          {targetCals > 0 && overview?.progress && (
             <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
               <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide mb-3 flex items-center gap-2">
                 <Target className="text-cyan-600" size={16} /> Daily Goal Status
               </h3>
               <p className="text-sm text-[#6B7280] font-medium leading-relaxed">
                 You have consumed <span className="text-[#111827] font-bold">{overview.progress.caloriesPercent}%</span> of your calorie target, and <span className="text-[#111827] font-bold">{overview.progress.proteinPercent}%</span> of your daily protein target.
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
