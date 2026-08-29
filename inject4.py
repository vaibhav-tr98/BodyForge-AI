import os

filepath = "client/src/pages/workouts/components/WorkoutForm.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Replace the useForm block
old_useform = """
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      exercises: [{ name: "", sets: 1, reps: 1, weight: undefined }],
    },
  });
"""

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
    defaultValues: initialData || {
      name: "",
      description: "",
      exercises: [{ name: "", sets: 1, reps: 1, weight: undefined }],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);
"""

content = content.replace(old_useform.strip(), new_useform.strip())

with open(filepath, "w") as f:
    f.write(content)
