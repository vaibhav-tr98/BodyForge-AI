import os

filepath = "client/src/pages/workouts/components/WorkoutForm.tsx"
with open(filepath, "r") as f:
    content = f.read()

content = content.replace('import { useState } from "react";', 'import { useState, useEffect } from "react";')

injection = """
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

# Replace the useForm block
import re
content = re.sub(r'const {\s+register,\s+control,\s+handleSubmit,\s+setValue,\s+watch,\s+formState: { errors },\s+} = useForm<WorkoutFormData>\({[^}]+}[^}]+}\);', injection.strip(), content, flags=re.DOTALL)

with open(filepath, "w") as f:
    f.write(content)
