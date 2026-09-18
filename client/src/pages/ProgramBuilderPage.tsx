import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Copy, Save, Play, Info, ArrowLeft } from "lucide-react";
import { api } from "../services/api";
import Loader from "../components/ui/Loader";

export default function ProgramBuilderPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [weeks, setWeeks] = useState<{ days: { dayIndex: number; workoutId: string | null }[] }[]>([
    {
      days: Array.from({ length: 7 }).map((_, i) => ({ dayIndex: i, workoutId: null })),
    },
  ]);

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const response = await api.get("/api/workouts");
        setWorkouts(response.data.data.workouts);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load workouts");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkouts();
  }, []);

  const addWeek = () => {
    if (weeks.length >= 52) return;
    setWeeks([...weeks, { days: Array.from({ length: 7 }).map((_, i) => ({ dayIndex: i, workoutId: null })) }]);
  };

  const removeWeek = (index: number) => {
    if (weeks.length <= 1) return;
    setWeeks(weeks.filter((_, i) => i !== index));
  };

  const duplicateWeek = (index: number) => {
    if (weeks.length >= 52) return;
    const weekToDuplicate = JSON.parse(JSON.stringify(weeks[index]));
    const newWeeks = [...weeks];
    newWeeks.splice(index + 1, 0, weekToDuplicate);
    setWeeks(newWeeks);
  };

  const updateDay = (weekIndex: number, dayIndex: number, workoutId: string | null) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days[dayIndex].workoutId = workoutId;
    setWeeks(newWeeks);
  };

  const saveProgram = async (status: "draft" | "active") => {
    if (!name.trim()) {
      setError("Program name is required");
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      const response = await api.post("/api/programs", {
        name,
        goal,
        startDate,
        timezone,
        weeks,
      });
      
      const programId = response.data.data.program.id;
      
      if (status === "active") {
        await api.patch(`/api/programs/${programId}`, { status: "active" });
      }
      
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to save program as ${status}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold text-white">Program Builder</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 flex items-center gap-2">
          <Info size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Program Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="e.g. 12-Week Hypertrophy"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Goal (Optional)</label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="e.g. Build muscle mass and strength"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Timezone *</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-800/50 p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Week {weekIndex + 1}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateWeek(weekIndex)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                  title="Duplicate Week"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={() => removeWeek(weekIndex)}
                  disabled={weeks.length === 1}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove Week"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {week.days.map((day, dayIndex) => (
                <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="sm:w-24 shrink-0 text-sm font-medium text-slate-400">
                    Day {dayIndex + 1}
                  </div>
                  <select
                    value={day.workoutId || ""}
                    onChange={(e) => updateDay(weekIndex, dayIndex, e.target.value || null)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Rest Day</option>
                    {workouts.map((w) => (
                      <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {weeks.length < 52 && (
        <button
          onClick={addWeek}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <Plus size={20} />
          Add Week
        </button>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-slate-800 pb-10">
        <button
          onClick={() => saveProgram("draft")}
          disabled={saving}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-slate-800 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <Save size={18} />
          Save as Draft
        </button>
        <button
          onClick={() => saveProgram("active")}
          disabled={saving}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-cyan-600 px-8 py-3 font-semibold text-white shadow-[0_0_15px_rgba(8,145,178,0.4)] transition hover:bg-cyan-500 disabled:opacity-50"
        >
          <Play size={18} className="fill-current" />
          Activate Program
        </button>
      </div>
    </div>
  );
}
