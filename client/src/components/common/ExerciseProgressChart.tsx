import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ExerciseProgress } from "../../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ExerciseProgressChartProps {
  progress: ExerciseProgress;
}

export default function ExerciseProgressChart({ progress }: ExerciseProgressChartProps) {
  // Use the last 10 sessions from the API (already ordered chronologically)
  const labels = progress.sessions.map((_, index) => `S${index + 1}`);
  
  const weights = progress.sessions.map((s) => s.weight);

  const data = {
    labels,
    datasets: [
      {
        label: "Weight Progression (kg)",
        data: weights,
        borderColor: "rgb(6, 182, 212)", // cyan-500
        backgroundColor: "rgba(6, 182, 212, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#94a3b8", // slate-400
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const session = progress.sessions[index];
            return [
              `Weight: ${session.weight} kg`,
              `Total Reps: ${session.totalReps}`,
              `Volume: ${session.volume} kg`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: "#94a3b8",
        },
        grid: {
          color: "#1e293b", // slate-800
        },
      },
      x: {
        ticks: {
          color: "#94a3b8",
        },
        grid: {
          color: "#1e293b",
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
