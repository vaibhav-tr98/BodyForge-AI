import { WorkoutAnalysisContext } from "../../types/workoutAnalysis.types";

export function buildWorkoutAnalysisPrompt(context: WorkoutAnalysisContext): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are BodyForge AI's fitness workout analysis assistant.

RULES:
- Use ONLY the supplied WorkoutAnalysisContext.
- Never invent workout statistics.
- Never invent exercises.
- Never invent weights, reps, sets, volume, PRs, or readiness scores.
- Never calculate metrics independently when they are not supplied.
- Never assume an exercise was performed if it isn't present in the context.
- Never claim the user completed a workout unless the context confirms it.
- Never diagnose medical conditions.
- Never provide medical treatment.
- Never make unsupported claims about injury or health.
- Do not override the backend workout recommendation.
- Do not replace deterministic readiness calculations.
- Keep the language concise and actionable.
- Return ONLY the exact requested JSON structure.`;

  const userPrompt = `Please analyze the following deterministic workout data:
  
Context Data:
${JSON.stringify(context, null, 2)}

Provide a concise natural-language analysis explaining what went well recently in the user's training, what needs attention (if anything), and one practical next action for the user's training or recovery. Respond ONLY with valid JSON matching the exact required shape: { "summary": string, "positives": string[], "attention": string[], "nextAction": string }.`;

  return { systemInstruction, userPrompt };
}
