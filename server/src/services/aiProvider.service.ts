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

export const AIProvider = {
  async generateStructuredAnalysis(context: ProgressAnalysisContext): Promise<ProgressAnalysisDTO> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    // Dynamic import to support ESM package in CommonJS project
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { systemInstruction, userPrompt } = buildProgressAnalysisPrompt(context);
    const model = process.env.AI_MODEL || "gemini-2.5-flash";

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

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    // Dynamic import to support ESM package in CommonJS project
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { systemInstruction, userPrompt } = buildNutritionAnalysisPrompt(context);
    const model = process.env.AI_MODEL || "gemini-2.5-flash";

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

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { systemInstruction, userPrompt } = buildWorkoutAnalysisPrompt(context);
    const model = process.env.AI_MODEL || "gemini-2.5-flash";

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

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { systemInstruction, userPrompt } = buildReadinessAnalysisPrompt(context);
    const model = process.env.AI_MODEL || "gemini-2.5-flash";

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

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

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
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("AI provider not configured: GEMINI_API_KEY is missing");
    }
    
    const { GoogleGenAI } = await eval('import("@google/genai")');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { systemInstruction, userPrompt } = buildDailySummaryPrompt(context);
    const model = process.env.AI_MODEL || "gemini-2.5-flash";

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

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (error) {
      throw new Error("Failed to parse AI response as JSON.");
    }

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
