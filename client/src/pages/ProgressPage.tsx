import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, TrendingDown, TrendingUp, Minus, Calendar, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { getProgressHistory, getProgressSummary, createProgressEntry, deleteProgressEntry, updateProgressEntry } from "../services/progress.service";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { getErrorMessage } from "../services/api";
import type { ProgressEntry } from "../types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatDate = (dateStr: string, format: "short" | "long" = "long") => {
  const d = new Date(dateStr);
  if (format === "short") {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");
  const [arm, setArm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["progress", "summary"],
    queryFn: getProgressSummary,
  });

  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["progress", "history"],
    queryFn: getProgressHistory,
  });

  const createMutation = useMutation({
    mutationFn: createProgressEntry,
    onSuccess: () => {
      toast.success("Progress entry added");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      resetForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProgressEntry(id, data),
    onSuccess: () => {
      toast.success("Progress entry updated");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      resetForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgressEntry,
    onSuccess: () => {
      toast.success("Progress entry deleted");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setWeight("");
    setBodyFat("");
    setWaist("");
    setChest("");
    setArm("");
    setEditingId(null);
  };

  const handleEdit = (entry: ProgressEntry) => {
    setEditingId(entry._id);
    setDate(entry.date);
    setWeight(entry.weight.toString());
    setBodyFat(entry.bodyFatPercentage?.toString() || "");
    setWaist(entry.waist?.toString() || "");
    setChest(entry.chest?.toString() || "");
    setArm(entry.arm?.toString() || "");
    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      date,
      weight: Number(weight),
    };

    if (bodyFat) data.bodyFatPercentage = Number(bodyFat);
    if (waist) data.waist = Number(waist);
    if (chest) data.chest = Number(chest);
    if (arm) data.arm = Number(arm);

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Chart Data preparation (ascending order for the chart)
  const chartData = {
    labels: (history || []).slice().reverse().map(e => formatDate(e.date, "short")),
    datasets: [
      {
        label: 'Weight (kg)',
        data: (history || []).slice().reverse().map(e => e.weight),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        grid: {
          color: '#1e293b',
        },
        ticks: {
          color: '#94a3b8',
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
        }
      }
    }
  };

  if (isLoadingSummary || isLoadingHistory) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Progress Tracking</h1>
        <p className="mt-2 text-slate-400">
          Track your weight, body measurements, and visualize your progress over time.
        </p>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <Activity className="h-5 w-5 text-cyan-500" />
            <h3 className="font-medium">Current Weight</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {summary?.currentWeight ? `${summary.currentWeight} kg` : "-"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <h3 className="font-medium">Starting Weight</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {summary?.startingWeight ? `${summary.startingWeight} kg` : "-"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h3 className="font-medium">Total Change</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {summary?.weightChange != null ? `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg` : "-"}
          </p>
          {summary?.weightChangePercentage != null && (
            <p className="text-sm text-slate-400">{summary.weightChangePercentage > 0 ? '+' : ''}{summary.weightChangePercentage}%</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3 text-slate-400">
            {summary?.trend === "losing" ? (
              <TrendingDown className="h-5 w-5 text-emerald-500" />
            ) : summary?.trend === "gaining" ? (
              <TrendingUp className="h-5 w-5 text-rose-500" />
            ) : (
              <Minus className="h-5 w-5 text-slate-400" />
            )}
            <h3 className="font-medium">Trend</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-white capitalize">
            {summary?.trend === "no_history" ? "No History" : summary?.trend}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ADD ENTRY FORM */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-6 text-xl font-bold text-white">
            {editingId ? "Edit Entry" : "Record Progress"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              type="number"
              step="0.1"
              label="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
              min={20}
              max={500}
            />
            <Input
              type="number"
              step="0.1"
              label="Body Fat % (Optional)"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              min={1}
              max={70}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.1"
                label="Waist (cm)"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                min={10}
                max={300}
              />
              <Input
                type="number"
                step="0.1"
                label="Chest (cm)"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                min={10}
                max={300}
              />
            </div>
            <Input
              type="number"
              step="0.1"
              label="Arms (cm)"
              value={arm}
              onChange={(e) => setArm(e.target.value)}
              min={5}
              max={100}
            />
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full" 
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Update Entry" : "Add Entry"}
              </Button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-2 w-full text-sm text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* CHART & HISTORY */}
        <div className="space-y-8 lg:col-span-2">
          {/* CHART */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-6 text-xl font-bold text-white">Weight Trend</h2>
            <div className="h-64">
              {history && history.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  No progress history to display
                </div>
              )}
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-6 text-xl font-bold text-white">History</h2>
            {history && history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Weight</th>
                      <th className="pb-3 font-medium">Body Fat</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {history.map((entry) => (
                      <tr key={entry._id}>
                        <td className="py-4">{formatDate(entry.date, "long")}</td>
                        <td className="py-4 font-medium text-white">{entry.weight} kg</td>
                        <td className="py-4">{entry.bodyFatPercentage ? `${entry.bodyFatPercentage}%` : "-"}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEdit(entry)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(entry._id)}
                              className="rounded p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                No entries found. Start tracking today!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
