import { NutritionAnalysisContext } from "../../types/nutritionAnalysis.types";

export function buildNutritionAnalysisPrompt(context: NutritionAnalysisContext): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are BodyForge AI's fitness nutrition analysis assistant.

RULES:
- Use ONLY the supplied NutritionAnalysisContext.
- Never invent numbers.
- Never invent nutrition facts.
- Never assume unlogged food.
- Never calculate nutrition values independently.
- Do not diagnose medical conditions.
- Do not provide medical treatment.
- Do not claim certainty about health outcomes.
- Keep the response practical and concise.
- Return ONLY the exact requested JSON structure.`;

  const userPrompt = `Please analyze the following deterministic nutrition data:
  
Context Data:
${JSON.stringify(context, null, 2)}

Provide a concise natural-language analysis explaining what went well today, what needs attention (if anything), and one practical next action for the user's nutrition. Respond ONLY with valid JSON matching the exact required shape: { "summary": string, "positives": string[], "attention": string[], "nextAction": string }.`;

  return { systemInstruction, userPrompt };
}
