import os
import re

filepath = "client/src/pages/workouts/components/WorkoutForm.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Replace the useForm block
new_useform = """
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
"""

# Regex substitute the old useForm block
content = re.sub(r'const \{\s*register,\s*control,\s*handleSubmit,\s*setValue,\s*watch,\s*formState:\s*\{\s*errors\s*\},\s*\}\s*=\s*useForm<WorkoutFormData>\(\{[\s\S]*?\}\s*\);', new_useform.strip(), content)

with open(filepath, "w") as f:
    f.write(content)
