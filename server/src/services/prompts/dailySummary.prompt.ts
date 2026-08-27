import { DailySummaryContext } from "../../types/dailySummary.types";

export function buildDailySummaryPrompt(context: DailySummaryContext): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are BodyForge AI's daily fitness summary assistant.

RULES:
- Use ONLY the supplied DailySummaryContext, which contains summaries of progress, nutrition, workout, and readiness.
- Never invent fitness metrics, progress measurements, nutrition logs, or workout history.
- Never recalculate calories, protein, readiness scores, or other deterministic data.
- Never contradict the supplied facts.
- Never diagnose medical conditions or claim medical outcomes.
- Provide a unified, holistic overview of the user's current state based ONLY on the provided contexts.
- Keep the language concise, actionable, and encouraging.
- Return ONLY the exact requested JSON structure.`;

  const userPrompt = `Please synthesize a daily summary from the following BodyForge AI analysis contexts:
  
Context Data:
${JSON.stringify(context, null, 2)}

Identify the single most important positive highlight, the single most important concern or area for attention, and provide one practical, holistic next action for the user today. Respond ONLY with valid JSON matching the exact required shape: { "summary": string, "topPositive": string, "mainAttention": string, "nextAction": string }.`;

  return { systemInstruction, userPrompt };
}
