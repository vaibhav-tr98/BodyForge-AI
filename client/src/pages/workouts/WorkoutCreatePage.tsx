import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { createWorkout } from "../../services/workout.service";
import WorkoutForm from "./components/WorkoutForm";

export default function WorkoutCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Create Workout</h1>
        <p className="mt-2 text-slate-400">
          Design a new routine by adding exercises, sets, and reps.
        </p>
      </div>

      <WorkoutForm
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        submitLabel="Create Workout"
      />
    </div>
  );
}
