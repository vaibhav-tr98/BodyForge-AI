import { WorkoutGeneratorContext } from "../../types/workoutGenerator.types";

export const buildWorkoutGeneratorPrompt = (context: WorkoutGeneratorContext) => {
  const systemInstruction = `
You are BodyForge AI, an expert strength and conditioning coach.
Your task is to generate a personalized workout plan based on the user's input and profile.
Follow these strict rules:
1. Return ONLY valid JSON matching the requested schema. No markdown formatting outside the JSON block.
2. Provide a suitable name and brief description (max 2 sentences).
3. The number of exercises should fit within the available time (${context.availableTime} minutes). Usually, 1 exercise takes ~5-8 minutes including rest.
4. Base the exercises on the target muscles: ${context.targetMuscles || "Full Body"}.
5. Use only the available equipment: ${context.equipment || "Standard Gym"}.
6. Adjust the volume (sets/reps) for their experience level: ${context.userExperience || "beginner"}.
7. Optimize for their fitness goal: ${context.userFitnessGoal || "improve_fitness"}.
8. Ensure exercises are realistic and standard (e.g., "Barbell Bench Press", "Dumbbell Curl").
  `.trim();

  const userPrompt = `
Generate a workout plan with the following constraints:
- Target Muscles: ${context.targetMuscles || "Full Body"}
- Available Time: ${context.availableTime} minutes
- Equipment: ${context.equipment || "Standard Gym"}

User Profile:
- Experience Level: ${context.userExperience || "Unknown"}
- Fitness Goal: ${context.userFitnessGoal || "Unknown"}
- Age: ${context.userAge ? context.userAge + " years" : "Unknown"}
- Gender: ${context.userGender || "Unknown"}
  `.trim();

  return { systemInstruction, userPrompt };
};
