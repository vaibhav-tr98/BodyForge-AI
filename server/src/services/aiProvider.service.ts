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
import { hashContext } from "../utils/hashContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      rawSnippet: text.substring(0, 100),
    });
    throw new Error("Failed to parse AI response as JSON.");
  }
}

/**
 * Classify a Gemini error to determine quota/rate-limit status.
 * isQuotaExhausted = true means the daily/monthly quota is spent.
 */
export function classifyGeminiError(error: unknown): {
  isQuotaExhausted: boolean;
  isRateLimit: boolean;
  isServerError: boolean;
  isRetryable: boolean;
  retryAfterMs: number | null;
} {
  const result = {
    isQuotaExhausted: false,
    isRateLimit: false,
    isServerError: false,
    isRetryable: false,
    retryAfterMs: null as number | null
  };

  if (!(error instanceof Error)) {
    return result;
  }

  const msg = error.message.toLowerCase();
  
  // Also check full serialized string for retry delay and other keys
  const fullString = String(error).toLowerCase() + " " + JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();
  
  // Extract RetryInfo.retryDelay e.g., "35s", "6s"
  const retryMatch = fullString.match(/retrydelay.*?(\d+)s/i) || fullString.match(/retrydelay['"\s:]+(\d+)s/i);
  if (retryMatch && retryMatch[1]) {
    result.retryAfterMs = parseInt(retryMatch[1], 10) * 1000;
  }

  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand") || msg.includes("overloaded")) {
    result.isServerError = true;
    result.isRetryable = true;
  } else if (msg.includes("generate_content_free_tier_requests") || msg.includes("resource_exhausted") || msg.includes("explicit quota exhaustion")) {
    result.isQuotaExhausted = true;
    result.isRetryable = false;
  } else if (msg.includes("429") || msg.includes("rate limit") || msg.includes("rpm")) {
    result.isRateLimit = true;
    result.isRetryable = true;
  }

  return result;
}

/**
 * Executes a Gemini API call with exponential backoff for rate limits and server errors.
 */
export async function withGeminiRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let attempt = 1;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      const classified = classifyGeminiError(error);

      if (!classified.isRetryable || attempt >= maxAttempts) {
        throw error;
      }

      const retryDelay = classified.retryAfterMs ?? (5000 * Math.pow(2, attempt - 1));
      
      logger.warn(`Gemini API error - Retrying`, {
        operation,
        attempt,
        maxAttempts,
        errorClassification: classified,
        retryDelay,
        errorMessage: error instanceof Error ? error.message : String(error)
      });

      await new Promise(resolve => setTimeout(resolve, retryDelay));
      attempt++;
    }
  }
}

// ---------------------------------------------------------------------------
// Single-Flight Request Coalescing
// ---------------------------------------------------------------------------

const inFlightRequests = new Map<string, Promise<any>>();

export function withSingleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlightRequests.has(key)) {
    logger.info(`Single-flight coalescing Gemini request`, { key });
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// AIProvider
// ---------------------------------------------------------------------------

export const AIProvider = {
  async generateWorkoutPlan(userId: string, context: WorkoutGeneratorContext): Promise<GeneratedWorkoutDTO> {
    const key = `${userId}-generateWorkoutPlan-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
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
                    reps: { type: "INTEGER" },
                  },
                  required: ["name", "sets", "reps"],
                },
              },
            },
            required: ["name", "description", "exercises"],
          },
        },
      });

      if (!response.text) {
        throw new Error("AI returned an empty response.");
      }

      let parsedResponse = parseAIResponse(response.text);

      const { z } = require("zod");
      const schema = z.object({
        name: z.string(),
        description: z.string(),
        exercises: z.array(
          z.object({
            name: z.string(),
            sets: z.number().int().min(1),
            reps: z.number().int().min(1),
          })
        ),
      });

      const validationResult = schema.safeParse(parsedResponse);
      if (!validationResult.success) {
        throw new Error("AI output validation failed.");
      }

      return validationResult.data as GeneratedWorkoutDTO;
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateWorkoutPlan",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },

  async generateStructuredAnalysis(userId: string, context: ProgressAnalysisContext): Promise<ProgressAnalysisDTO> {
    const key = `${userId}-generateStructuredAnalysis-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
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
              nextAction: { type: "STRING" },
            },
            required: ["summary", "positives", "attention", "nextAction"],
          },
        },
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
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateStructuredAnalysis",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },

  async generateNutritionAnalysis(userId: string, context: NutritionAnalysisContext): Promise<NutritionAnalysisDTO> {
    const key = `${userId}-generateNutritionAnalysis-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
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
              nextAction: { type: "STRING" },
            },
            required: ["summary", "positives", "attention", "nextAction"],
          },
        },
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
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateNutritionAnalysis",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },

  async generateWorkoutAnalysis(userId: string, context: WorkoutAnalysisContext): Promise<WorkoutAnalysisDTO> {
    const key = `${userId}-generateWorkoutAnalysis-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
        return await withGeminiRetry("generateWorkoutAnalysis", async () => {
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
                nextAction: { type: "STRING" },
              },
              required: ["summary", "positives", "attention", "nextAction"],
            },
          },
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
      });
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateWorkoutAnalysis",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },

  async generateReadinessAnalysis(userId: string, context: ReadinessAnalysisContext): Promise<ReadinessAnalysisDTO> {
    const key = `${userId}-generateReadinessAnalysis-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
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
              nextAction: { type: "STRING" },
            },
            required: ["summary", "positives", "attention", "nextAction"],
          },
        },
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
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateReadinessAnalysis",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },

  async generateDailySummary(userId: string, context: DailySummaryContext): Promise<DailySummaryDTO> {
    const key = `${userId}-generateDailySummary-${hashContext(context)}`;
    return withSingleFlight(key, async () => {
      try {
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
              nextAction: { type: "STRING" },
            },
            required: ["summary", "topPositive", "mainAttention", "nextAction"],
          },
        },
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
    } catch (error: any) {
      const classified = classifyGeminiError(error);
      logger.error("Gemini generateContent failed", {
        operation: "generateDailySummary",
        isQuotaExhausted: classified.isQuotaExhausted,
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    });
  },
};
