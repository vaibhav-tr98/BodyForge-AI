import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, X, Filter, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { getExercises } from "../../../services/exercise.service";
import type { Exercise } from "../../../services/exercise.service";

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  onCancel: () => void;
}

export function ExerciseSelector({ onSelect, onCancel }: ExerciseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced" | "">("");
  const [page, setPage] = useState(1);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["exercises", debouncedSearchTerm, muscle, equipment, difficulty, page],
    queryFn: () =>
      getExercises({
        q: debouncedSearchTerm,
        muscle,
        equipment,
        difficulty: difficulty as any,
        page,
        limit: 20,
      }),
  });

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl flex flex-col h-[80vh] max-h-[700px] overflow-hidden text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
        <h3 className="text-lg font-bold text-white">Select Exercise</h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-5 border-b border-slate-800 bg-slate-900 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-3 border border-slate-700 rounded-lg bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-shadow"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-1.5 text-sm text-slate-400 font-medium mr-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </div>
          <select
            value={muscle}
            onChange={handleFilterChange(setMuscle)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 px-3 py-1.5 outline-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="">Muscle: All</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="shoulders">Shoulders</option>
            <option value="biceps">Biceps</option>
            <option value="triceps">Triceps</option>
            <option value="legs">Legs</option>
            <option value="abdominals">Abs</option>
          </select>

          <select
            value={equipment}
            onChange={handleFilterChange(setEquipment)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 px-3 py-1.5 outline-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="">Equipment: All</option>
            <option value="body only">Bodyweight</option>
            <option value="dumbbell">Dumbbell</option>
            <option value="barbell">Barbell</option>
            <option value="cable">Cable</option>
            <option value="machine">Machine</option>
            <option value="kettlebell">Kettlebell</option>
          </select>

          <select
            value={difficulty}
            onChange={handleFilterChange(setDifficulty)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 px-3 py-1.5 outline-none cursor-pointer hover:border-slate-600 transition-colors"
          >
            <option value="">Difficulty: All</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto bg-slate-950/30 p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            <p>Loading exercises...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <div className="space-y-1">
              <p className="text-lg font-medium text-slate-300">Failed to load exercises</p>
              <p className="text-sm">We couldn't reach the server right now.</p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 mt-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : data?.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <Search className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-lg font-medium text-slate-400">No exercises found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <ul className="space-y-2 p-2">
            {data?.exercises.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSelect(exercise)}
                  className="w-full text-left p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      {exercise.name}
                    </div>
                    <div className="text-sm text-slate-400 flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
                      {exercise.primaryMuscles.length > 0 && (
                        <span className="capitalize">{exercise.primaryMuscles.join(", ")}</span>
                      )}
                      {(exercise.primaryMuscles.length > 0 && exercise.equipment) && <span>·</span>}
                      {exercise.equipment && <span className="capitalize">{exercise.equipment}</span>}
                      {(exercise.equipment || exercise.primaryMuscles.length > 0) && <span>·</span>}
                      <span className="capitalize">{exercise.difficulty}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-400 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4" />
                    Select
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-medium border border-slate-700 bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-slate-300"
          >
            Previous
          </button>
          <span className="text-sm font-medium text-slate-400">
            Page {page} of {data.totalPages}
          </span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-medium border border-slate-700 bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-slate-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
