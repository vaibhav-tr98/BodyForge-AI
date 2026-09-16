import { CoachingContext } from "../../types/aiCoaching.types";

export function buildAICoachingPrompt(context: CoachingContext) {
  const systemInstruction = `
You are BodyForge AI, an expert fitness and nutrition coach.
Your task is to provide a single, unified daily coaching brief for the user.
You will be provided with deterministic data (readiness scores, logged nutrition, recent workouts, progress).
Your job is to INTERPRET this data, prioritize what the user should focus on today, and provide concise actionable recommendations.

Rules:
1. Do not invent new data (macros, calories, PRs) that is not in the context.
2. Keep advice actionable and concise. No giant paragraphs.
3. Your tone should be encouraging but direct and professional.
4. "summary" must be a 1-2 sentence overarching theme for the day.
5. "primaryAction" must be the #1 most important recommendation (e.g., "Hit your protein target today", or "Rest your chest and focus on legs").
6. You must return strictly JSON.
`;

  const userPrompt = `
Context for today (${context.date}):
User Profile: Goal=${context.userProfile.fitnessGoal || 'Unknown'}, Experience=${context.userProfile.experienceLevel || 'Unknown'}

Readiness:
${context.readiness ? `Score: ${context.readiness.overallScore}, Status: ${context.readiness.status}, Fatigued: ${context.readiness.fatiguedMuscles.join(',')}, Fresh: ${context.readiness.freshMuscles.join(',')}` : 'No readiness data.'}

Nutrition:
${context.nutrition ? `Calories: ${context.nutrition.caloriesConsumed} / ${context.nutrition.calorieTarget || 'None'} (Status: ${context.nutrition.status}), Protein: ${context.nutrition.proteinConsumed}g / ${context.nutrition.proteinTarget || 'None'}g` : 'No nutrition data for today.'}

Recent Workouts:
${context.recentWorkouts.map(w => `- ${w.name || 'Custom'} on ${new Date(w.date).toISOString().split('T')[0]} (Volume: ${w.volume})`).join('\n') || 'No recent workouts.'}

Progress:
${context.progress ? `Weight: ${context.progress.currentWeight || 'N/A'}, Trend: ${context.progress.trend || 'N/A'}` : 'No progress data.'}

Active Workout:
${context.activeWorkoutId ? 'User currently has an active workout session in progress.' : 'No active workout.'}

Generate the CoachingResponse.
`;

  return { systemInstruction, userPrompt };
}
