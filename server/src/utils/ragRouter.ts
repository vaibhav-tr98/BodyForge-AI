import { KnowledgeCategory } from "../models/KnowledgeDocument";

export interface RagRoutingDecision {
  shouldRetrieve: boolean;
  category?: KnowledgeCategory;
  reason: string;
}

export function routeKnowledgeQuery(message: string): RagRoutingDecision {
  if (!message || typeof message !== "string") {
    return { shouldRetrieve: false, reason: "Empty message" };
  }

  const text = message.trim().toLowerCase();

  // 1. Personal structured queries — handled exclusively by deterministic user fitness context
  const personalQueryPatterns = [
    /\bwhat did i (bench|squat|deadlift|lift|eat|log)\b/,
    /\bhow much (did i|have i|weight did i)\b/,
    /\bmy (history|workouts|sessions|macros|calories|weight|pr|records)\b/,
    /\bhow many workouts (did i|have i)\b/,
    /\bdid i (hit|meet|reach) my (macros|targets|calories|protein)\b/,
    /\bwhat was my last\b/,
    /\bshow my\b/,
  ];

  for (const pattern of personalQueryPatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: false,
        reason: "Personal structured history lookup — handled via deterministic database context",
      };
    }
  }

  // 2. Casual pleasantries and conversational filler
  const casualPatterns = [
    /^(hi|hello|hey|yo|howdy|sup|greetings)(\s+coach|\s+there|\s+bodyforge)?\.?$/,
    /^(thanks|thank you|thx|awesome|cool|great|ok|okay|got it|sounds good)\.?$/,
    /^(good morning|good evening|good afternoon|bye|goodbye)\.?$/,
  ];

  for (const pattern of casualPatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: false,
        reason: "General conversational greeting — vector search not required",
      };
    }
  }

  // 3. Recovery, Deload, and Fatigue Management
  const recoveryPatterns = [
    /\b(deload|deloading|accumulated fatigue|systemic fatigue)\b/,
    /\b(doms|muscle soreness|overtraining|cns fatigue|recovery protocol)\b/,
    /\b(rpe|rir|reps in reserve|autoregulation)\b/,
  ];

  for (const pattern of recoveryPatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: true,
        category: "recovery",
        reason: "Fatigue management, deload, or recovery inquiry",
      };
    }
  }

  // 4. Nutrition Education & Science
  const nutritionPatterns = [
    /\b(protein|protein intake|leucine|mtor|muscle protein synthesis|mps)\b/,
    /\b(creatine|macronutrient|energy balance|caloric deficit|calorie surplus)\b/,
    /\b(nutrient timing|glycogen replenishment|pre-workout nutrition|post-workout)\b/,
  ];

  for (const pattern of nutritionPatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: true,
        category: "nutrition",
        reason: "Nutritional science and sports dietetics inquiry",
      };
    }
  }

  // 5. General Training Methodology & Hypertrophy Principles (including plateaus)
  const trainingPatterns = [
    /\b(hypertrophy|progressive overload|mechanical tension|metabolic stress)\b/,
    /\b(periodization|volume|training frequency|sets per week|rep range)\b/,
    /\b(plateau|stall|stalled|break through|sticking point)\b/,
  ];

  for (const pattern of trainingPatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: true,
        category: "training",
        reason: "Training methodology and progressive overload inquiry",
      };
    }
  }

  // 6. Exercise Technique & Biomechanics
  const exercisePatterns = [
    /\b(bench press|squat|deadlift|overhead press|barbell row|lat pulldown|dumbbell press)\b/,
    /\b(bar path|elbow flare|grip width|arch|foot angle|scapular|depth|knee valgus|hip crease)\b/,
    /\b(technique|biomechanic|proper form|form check|correct form|cues)\b/,
  ];

  for (const pattern of exercisePatterns) {
    if (pattern.test(text)) {
      return {
        shouldRetrieve: true,
        category: "exercise",
        reason: "Exercise technique and biomechanics inquiry",
      };
    }
  }

  return {
    shouldRetrieve: false,
    reason: "Query does not require technical knowledge base retrieval",
  };
}
