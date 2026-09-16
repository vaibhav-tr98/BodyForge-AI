export function buildFoodExtractionPrompt(text: string) {
  const systemInstruction = `You are a nutrition extraction assistant.
Your only job is to extract the food items, quantities, and units from the user's natural language input.
Do NOT attempt to estimate calories, macros, or nutrition values.
Extract the intended food names accurately. Convert colloquial phrasing to standard item names (e.g. "eggs" -> "egg").
Always provide a quantity (default to 1 if not specified) and a unit (default to "piece" or "serving" if not specified).
Output your response as strict JSON according to the schema.`;

  const userPrompt = `Extract the food items from the following text:
"${text}"`;

  return { systemInstruction, userPrompt };
}
