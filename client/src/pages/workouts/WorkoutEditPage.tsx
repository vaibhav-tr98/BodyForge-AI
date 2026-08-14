import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getWorkoutById, updateWorkout } from "../../services/workout.service";
import WorkoutForm from "./components/WorkoutForm";
import Loader from "../../components/ui/Loader";

export default function WorkoutEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workout, isLoading, isError } = useQuery({
    queryKey: ["workouts", id],
    queryFn: () => getWorkoutById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updateWorkout(id!, data),
    onSuccess: () => {
      toast.success("Workout updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workouts", id] });
      navigate(`/workouts/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update workout");
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isError || !workout) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        Failed to load workout. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Edit Workout</h1>
        <p className="mt-2 text-slate-400">
          Make changes to your routine.
        </p>
      </div>

      <WorkoutForm
        initialData={workout}
        onSubmit={(data) => mutation.mutate(data)}
        isSubmitting={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
