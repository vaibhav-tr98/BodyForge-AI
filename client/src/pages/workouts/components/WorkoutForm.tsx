import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ExerciseSelector } from "./ExerciseSelector";


// Note: we mirror the exact Zod schema used on the backend
const exerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(100, "Must be 100 characters or fewer"),
  sets: z
    .number({ message: "Sets must be a number" })
    .int("Sets must be a whole number")
    .min(1, "Must be at least 1 set"),
  reps: z
    .number({ message: "Reps must be a number" })
    .int("Reps must be a whole number")
    .min(1, "Must be at least 1 rep"),
  weight: z
    .number({ message: "Weight must be a number" })
    .min(0, "Weight cannot be negative")
    .optional(),
});

const workoutSchema = z.object({
  name: z
    .string()
    .min(1, "Workout name is required")
    .max(100, "Must be 100 characters or fewer"),
  description: z.string().max(500, "Must be 500 characters or fewer").optional(),
  exercises: z
    .array(exerciseSchema)
    .min(1, "At least one exercise is required"),
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

interface WorkoutFormProps {
  initialData?: Partial<WorkoutFormData>;
  onSubmit: (data: WorkoutFormData) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export default function WorkoutForm({
  initialData,
  onSubmit,
  isSubmitting,
  submitLabel,
}: WorkoutFormProps) {
  const [selectingExerciseIndex, setSelectingExerciseIndex] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      exercises: initialData?.exercises?.length
        ? initialData.exercises
        : [{ name: "", sets: 1, reps: 1, weight: undefined }],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData?.name || "",
        description: initialData?.description || "",
        exercises: initialData?.exercises?.length
          ? initialData.exercises
          : [{ name: "", sets: 1, reps: 1, weight: undefined }],
      });
    }
  }, [initialData, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises",
  });

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Workout Details ──────────────────────────────────────────────── */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Workout Name *
            </label>
            <input
              {...register("name")}
              id="name"
              className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. Push Day"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-300"
            >
              Description
            </label>
            <textarea
              {...register("description")}
              id="description"
              rows={3}
              className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g. Chest, shoulders, and triceps focus"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* ── Exercises ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Exercises</h2>
            <button
              type="button"
              onClick={() => append({ name: "", sets: 1, reps: 1, weight: undefined })}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
          </div>

          {errors.exercises?.root && (
            <p className="text-sm text-red-400">{errors.exercises.root.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => {
              const watchedName = watch(`exercises.${index}.name`);
              return (
              <div
                key={field.id}
                className="relative rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors focus-within:border-cyan-800"
              >
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute right-4 top-4 text-slate-500 hover:text-red-400"
                  title="Remove Exercise"
                >
                  <Trash2 className="h-5 w-5" />
                </button>

                <div className="mb-4 pr-10">
                  <label className="block text-sm font-medium text-slate-300">
                    Exercise Name *
                  </label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                    {watchedName ? (
                      <>
                        <div className="flex-1 font-semibold text-white bg-slate-950 px-3 py-2 rounded-md border border-slate-700">
                          {watchedName}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectingExerciseIndex(index)}
                          className="whitespace-nowrap rounded-md bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none transition-colors"
                        >
                          Change Exercise
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectingExerciseIndex(index)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-600 bg-slate-800/50 px-4 py-3 text-sm font-medium text-cyan-400 hover:bg-slate-800 hover:border-cyan-500 hover:text-cyan-300 focus:outline-none transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Select Exercise
                      </button>
                    )}
                  </div>
                  {errors.exercises?.[index]?.name && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.exercises[index]?.name?.message}
                    </p>
                  )}
                  {/* Hidden input to keep react-hook-form happy with registration if needed, though setValue handles it */}
                  <input type="hidden" {...register(`exercises.${index}.name`)} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Sets *
                    </label>
                    <input
                      type="number"
                      {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    {errors.exercises?.[index]?.sets && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.exercises[index]?.sets?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Reps *
                    </label>
                    <input
                      type="number"
                      {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    {errors.exercises?.[index]?.reps && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.exercises[index]?.reps?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register(`exercises.${index}.weight`, { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="Optional"
                    />
                    {errors.exercises?.[index]?.weight && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors.exercises[index]?.weight?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* ── Form Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4 border-t border-slate-800 pt-6">
          <Link
            to="/workouts"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center rounded-lg bg-cyan-600 px-6 py-2 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>

      {/* ── Exercise Selector Modal ──────────────────────────────────────── */}
      {selectingExerciseIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl">
            <ExerciseSelector
              onSelect={(exercise) => {
                setValue(`exercises.${selectingExerciseIndex}.name`, exercise.name, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setSelectingExerciseIndex(null);
              }}
              onCancel={() => setSelectingExerciseIndex(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
