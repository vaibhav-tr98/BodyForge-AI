import { WorkoutGeneratorContext, GeneratedWorkoutDTO } from "../types/workoutGenerator.types";
import { buildWorkoutGeneratorPrompt } from "./prompts/workoutGenerator.prompt";
import { ProgressAnalysisContext, ProgressAnalysisDTO } from "../types/progressAnalysis.types";
import { buildProgressAnalysisPrompt } from "./prompts/progressAnalysis.prompt";
import { NutritionAnalysisContext, NutritionAnalysisDTO } from "../types/nutritionAnalysis.types";
import { buildNutritionAnalysisPrompt } from "./prompts/nutritionAnalysis.prompt";
import { WorkoutAnalysisContext, WorkoutAnalysisDTO } from "../types/workoutAnalysis.types";
import { buildWorkoutAnalysisPrompt } from "./prompts/workoutAnalysis.prompt";
import { ReadinessAnalysisContext, ReadinessAnalysisDTO } from "../types/readinessAnalysis.types";
import { buildReadinessAnalysisPrompt } from "./prompts/readinessAnalysis.prompt";
import { DailySummaryContext, DailySummaryDTO } from "../types/dailySummary.types";
import { buildDailySummaryPrompt } from "./prompts/dailySummary.prompt";
import { env } from "../config/env";
import logger from "../utils/logger";

function parseAIResponse(text: string): any {
  if (!text || text.trim() === "") {
    logger.error("AI returned an empty or whitespace-only response");
    throw new Error("Empty AI response");
  }

  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines[lines.length - 1].trim().startsWith("```")) lines.pop();
    cleaned = lines.join("\n").trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    logger.error("Failed to parse AI response as JSON", { 
      error: error.message, 
      rawSnippet: text.substring(0, 100) 
    });
    throw new Error("Failed to parse AI response as JSON.");
  }
}

export const AIProvider = {

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

    let parsedResponse = parseAIResponse(response.text);

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

  async generateStructuredAnalysis(context: ProgressAnalysisContext): Promise<ProgressAnalysisDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    // Dynamic import to support ESM package in CommonJS project
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildProgressAnalysisPrompt(context);
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
            summary: { type: "STRING" },
            positives: { type: "ARRAY", items: { type: "STRING" } },
            attention: { type: "ARRAY", items: { type: "STRING" } },
            nextAction: { type: "STRING" }
          },
          required: ["summary", "positives", "attention", "nextAction"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse = parseAIResponse(response.text);

    const { z } = require("zod");
    const schema = z.object({
      summary: z.string(),
      positives: z.array(z.string()),
      attention: z.array(z.string()),
      nextAction: z.string(),
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as ProgressAnalysisDTO;
  },

  async generateNutritionAnalysis(context: NutritionAnalysisContext): Promise<NutritionAnalysisDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    // Dynamic import to support ESM package in CommonJS project
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildNutritionAnalysisPrompt(context);
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
            summary: { type: "STRING" },
            positives: { type: "ARRAY", items: { type: "STRING" } },
            attention: { type: "ARRAY", items: { type: "STRING" } },
            nextAction: { type: "STRING" }
          },
          required: ["summary", "positives", "attention", "nextAction"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse = parseAIResponse(response.text);

    const { z } = require("zod");
    const schema = z.object({
      summary: z.string(),
      positives: z.array(z.string()),
      attention: z.array(z.string()),
      nextAction: z.string(),
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as NutritionAnalysisDTO;
  },

  async generateWorkoutAnalysis(context: WorkoutAnalysisContext): Promise<WorkoutAnalysisDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildWorkoutAnalysisPrompt(context);
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
            summary: { type: "STRING" },
            positives: { type: "ARRAY", items: { type: "STRING" } },
            attention: { type: "ARRAY", items: { type: "STRING" } },
            nextAction: { type: "STRING" }
          },
          required: ["summary", "positives", "attention", "nextAction"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse = parseAIResponse(response.text);

    const { z } = require("zod");
    const schema = z.object({
      summary: z.string(),
      positives: z.array(z.string()),
      attention: z.array(z.string()),
      nextAction: z.string(),
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as WorkoutAnalysisDTO;
  },

  async generateReadinessAnalysis(context: ReadinessAnalysisContext): Promise<ReadinessAnalysisDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildReadinessAnalysisPrompt(context);
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
            summary: { type: "STRING" },
            positives: { type: "ARRAY", items: { type: "STRING" } },
            attention: { type: "ARRAY", items: { type: "STRING" } },
            nextAction: { type: "STRING" }
          },
          required: ["summary", "positives", "attention", "nextAction"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse = parseAIResponse(response.text);

    const { z } = require("zod");
    const schema = z.object({
      summary: z.string(),
      positives: z.array(z.string()),
      attention: z.array(z.string()),
      nextAction: z.string(),
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as ReadinessAnalysisDTO;
  },

  async generateDailySummary(context: DailySummaryContext): Promise<DailySummaryDTO> {
    if (!env.geminiApiKey) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const { systemInstruction, userPrompt } = buildDailySummaryPrompt(context);
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
            summary: { type: "STRING" },
            topPositive: { type: "STRING" },
            mainAttention: { type: "STRING" },
            nextAction: { type: "STRING" }
          },
          required: ["summary", "topPositive", "mainAttention", "nextAction"]
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response.");
    }

    let parsedResponse = parseAIResponse(response.text);

    const { z } = require("zod");
    const schema = z.object({
      summary: z.string(),
      topPositive: z.string(),
      mainAttention: z.string(),
      nextAction: z.string(),
    });

    const validationResult = schema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error("AI output validation failed.");
    }

    return validationResult.data as DailySummaryDTO;
  }
};
