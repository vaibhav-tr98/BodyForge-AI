import os

filepath = 'server/src/services/aiProvider.service.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Add imports
imports_to_add = """
import { WorkoutGeneratorContext, GeneratedWorkoutDTO } from "../types/workoutGenerator.types";
import { buildWorkoutGeneratorPrompt } from "./prompts/workoutGenerator.prompt";
"""
content = imports_to_add.strip() + "\n" + content

# Add the method inside AIProvider
method_code = """
  async generateWorkoutPlan(context: WorkoutGeneratorContext): Promise<GeneratedWorkoutDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildWorkoutGeneratorPrompt(context);
    const model = env.aiModel;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            description: { type: "STRING" },
            exercises: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  sets: { type: "INTEGER" },
                  reps: { type: "INTEGER" }
                },
                required: ["name", "sets", "reps"]
              }
            }
          },
          required: ["name", "description", "exercises"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

    const { z } = require("zod");
    const schema = z.object({
      name: z.string(),
      description: z.string(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number().int().min(1),
        reps: z.number().int().min(1)
      }))
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as GeneratedWorkoutDTO;
  },
"""

content = content.replace("export const AIProvider = {", "export const AIProvider = {\n" + method_code)

with open(filepath, 'w') as f:
    f.write(content)

