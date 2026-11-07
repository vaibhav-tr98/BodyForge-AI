import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Utensils } from "lucide-react";
import { getNutritionHistory } from "../../services/nutrition.service";
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
} from "chart.js";
import { Line } from "react-chartjs-2";

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

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function NutritionTrendsChart() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [metricMode, setMetricMode] = useState<"calories" | "macros">("calories");

  const { data: history, isLoading, isError, refetch } = useQuery({
    queryKey: ["nutrition", "history", days],
    queryFn: () => getNutritionHistory({ days }),
    staleTime: 5 * 60 * 1000,
  });

  const dayList = history?.days || [];
  const labels = dayList.map((d) => formatShortDate(d.date));
  const hasData = dayList.some((d) => d.calories > 0 || d.protein > 0);

  const caloriesChartData = {
    labels,
    datasets: [
      {
        label: "Calories (kcal)",
        data: dayList.map((d) => d.calories),
        borderColor: "#0891b2", // cyan-600
        backgroundColor: "rgba(8, 145, 178, 0.1)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#0891b2",
        pointBorderWidth: 2,
      },
    ],
  };

  const macrosChartData = {
    labels,
    datasets: [
      {
        label: "Protein (g)",
        data: dayList.map((d) => d.protein),
        borderColor: "#10b981", // emerald-500
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3.5,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#10b981",
        pointBorderWidth: 2,
      },
      {
        label: "Carbs (g)",
        data: dayList.map((d) => d.carbs),
        borderColor: "#f59e0b", // amber-500
        backgroundColor: "rgba(245, 158, 11, 0.05)",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3.5,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#f59e0b",
        pointBorderWidth: 2,
      },
      {
        label: "Fat (g)",
        data: dayList.map((d) => d.fat),
        borderColor: "#ec4899", // pink-500
        backgroundColor: "rgba(236, 72, 153, 0.05)",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3.5,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#ec4899",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: metricMode === "macros",
        position: "top" as const,
        labels: {
          color: "#4B5563",
          font: { family: "inherit", size: 12, weight: "bold" as const },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#FFFFFF",
        bodyColor: "#F7F8FA",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        grid: {
          color: "#E5E7EB",
        },
        ticks: {
          color: "#6B7280",
          font: { family: "inherit" },
        },
        border: { display: false },
        beginAtZero: true,
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
          font: { family: "inherit" },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg sm:text-xl font-bold text-[#111827]">Nutrition & Macro Trends</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Historical calorie and macronutrient consistency over time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-[#F1F3F5] p-1 border border-[#E5E7EB]">
            <button
              onClick={() => setMetricMode("calories")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                metricMode === "calories"
                  ? "bg-[#FFFFFF] text-cyan-700 shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Calories
            </button>
            <button
              onClick={() => setMetricMode("macros")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                metricMode === "macros"
                  ? "bg-[#FFFFFF] text-cyan-700 shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Macros
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex rounded-lg bg-[#F1F3F5] p-1 border border-[#E5E7EB]">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  days === d
                    ? "bg-[#FFFFFF] text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Averages Pills */}
      {history && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">
              Avg Daily Calories
            </span>
            <span className="text-lg sm:text-xl font-bold text-[#111827]">
              {history.averageCalories.toLocaleString()} <span className="text-xs font-normal text-[#6B7280]">kcal</span>
            </span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Avg Protein
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-900">
              {history.averageProtein} <span className="text-xs font-normal text-emerald-700">g</span>
            </span>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
              Avg Carbs
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-900">
              {history.averageCarbs} <span className="text-xs font-normal text-amber-700">g</span>
            </span>
          </div>

          <div className="rounded-xl border border-pink-100 bg-pink-50/50 p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-800 block mb-1">
              Avg Fat
            </span>
            <span className="text-lg sm:text-xl font-bold text-pink-900">
              {history.averageFat} <span className="text-xs font-normal text-pink-700">g</span>
            </span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center animate-pulse">
            <div className="h-8 w-8 rounded-full border-b-2 border-t-2 border-cyan-600 animate-spin"></div>
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-red-500 mb-2">Unable to load nutrition trends.</p>
            <button
              onClick={() => refetch()}
              className="text-xs font-semibold text-cyan-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#6B7280] p-4">
            <Utensils className="h-8 w-8 text-[#9CA3AF] mb-2" />
            <p className="text-sm font-medium">No meals logged for this {days}-day period.</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Log meals above or via Quick Log to see trends.</p>
          </div>
        ) : (
          <Line
            data={metricMode === "calories" ? caloriesChartData : macrosChartData}
            options={chartOptions}
          />
        )}
      </div>
    </div>
  );
}
