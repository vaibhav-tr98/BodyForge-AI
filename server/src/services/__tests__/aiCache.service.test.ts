/**
 * aiCache.service.test.ts
 *
 * Integration-level tests for the AI analysis caching layer.
 * All external dependencies (AI, repositories, services) are mocked.
 */
import { nutritionAnalysisService } from "../nutritionAnalysis.service";
import { workoutAnalysisService } from "../workoutAnalysis.service";
import { readinessAnalysisService } from "../readinessAnalysis.service";
import { dailySummaryService } from "../dailySummary.service";
import { AIProvider } from "../aiProvider.service";
import { aiAnalysisCacheRepository } from "../../repositories/aiAnalysisCache.repository";
import { nutritionService } from "../nutrition.service";
import { nutritionTargetService } from "../nutritionTarget.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { analyticsService } from "../analytics.service";
import { userRepository } from "../../repositories/user.repository";
import { progressAnalysisService } from "../progressAnalysis.service";

// classifyGeminiError is a pure utility — import the real implementation directly
// rather than the jest.mock() auto-mock (which would make it return undefined)
const { classifyGeminiError } = jest.requireActual("../aiProvider.service") as typeof import("../aiProvider.service");

jest.mock("../aiProvider.service");
jest.mock("../../repositories/aiAnalysisCache.repository");
jest.mock("../nutrition.service");
jest.mock("../nutritionTarget.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../analytics.service");
jest.mock("../../repositories/user.repository");
jest.mock("../progressAnalysis.service");

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const userId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439012";
const date = "2024-05-01";

const mockUser = { _id: userId, fitnessGoal: "lose_fat", age: 28, gender: "male" };
const mockOtherUser = { _id: otherUserId, fitnessGoal: "build_muscle", age: 30, gender: "male" };

const nutritionSummaryWithData = {
  date,
  totalCalories: 1800,
  totalProtein: 120,
  totalCarbs: 200,
  totalFat: 60,
};

const nutritionSummaryEmpty = {
  date,
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
};

const mockTargets = { calories: 2000, protein: 150 };

const mockNutritionAI = {
  summary: "Good nutrition day",
  positives: ["Hit protein goal"],
  attention: ["Slightly under calories"],
  nextAction: "Keep it up",
};

const mockWorkoutAI = {
  summary: "Great workout consistency",
  positives: ["3 sessions this week"],
  attention: ["Chest not trained recently"],
  nextAction: "Train chest tomorrow",
};

const mockReadinessAI = {
  summary: "You are fully recovered.",
  positives: ["Chest ready"],
  attention: [],
  nextAction: "Train hard",
};

const mockDailySummaryAI = {
  summary: "Solid day overall",
  topPositive: "Good protein intake",
  mainAttention: "Sleep more",
  nextAction: "Rest tonight",
};

// Mock readiness data with real history
const mockReadinessData = {
  overallScore: 85,
  status: "ready",
  recommendation: { reason: "Well rested" },
  muscleGroups: [
    {
      muscle: "Chest",
      readinessScore: 100,
      status: "ready",
      daysSinceLastTrained: 5,
      sessionsLast7Days: 2,
      sessionsLast14Days: 4,
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper to create a fake cached document
// ---------------------------------------------------------------------------
function makeCachedDoc(result: unknown) {
  return { result } as any;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();

  // Default user setup
  (userRepository.findById as jest.Mock).mockImplementation((id: string) => {
    if (id === userId) return Promise.resolve(mockUser);
    if (id === otherUserId) return Promise.resolve(mockOtherUser);
    return Promise.resolve(null);
  });

  // Default nutrition mocks
  (nutritionService.getSummary as jest.Mock).mockResolvedValue(nutritionSummaryWithData);
  (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue(mockTargets);
  (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
    recommendation: null,
  });

  // Default workout / readiness mocks
  (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(mockReadinessData);
  (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({
    insights: ["Some insight"],
    personalRecords: [],
  });

  // Default progress analysis mock (used by daily summary)
  (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({
    summary: "progress ok",
    positives: [],
    attention: [],
    nextAction: "",
  });

  // Default AI provider responses
  (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue(mockNutritionAI);
  (AIProvider.generateWorkoutAnalysis as jest.Mock).mockResolvedValue(mockWorkoutAI);
  (AIProvider.generateReadinessAnalysis as jest.Mock).mockResolvedValue(mockReadinessAI);
  (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue(mockDailySummaryAI);

  // Default: cache miss
  (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
  (aiAnalysisCacheRepository.save as jest.Mock).mockResolvedValue({});
});

// ===========================================================================
// Test 1: Cache miss → calls AIProvider once
// ===========================================================================
describe("Test 1: Cache miss calls AIProvider exactly once", () => {
  it("calls AIProvider.generateNutritionAnalysis on cache miss", async () => {
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(1);
    expect(aiAnalysisCacheRepository.save).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Test 2: Cache hit → does NOT call AIProvider
// ===========================================================================
describe("Test 2: Cache hit does NOT call AIProvider", () => {
  it("returns cached result without calling AIProvider", async () => {
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(
      makeCachedDoc(mockNutritionAI)
    );

    const result = await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    expect(AIProvider.generateNutritionAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(mockNutritionAI);
  });
});

// ===========================================================================
// Test 3: Same user + same input returns cached result
// ===========================================================================
describe("Test 3: Same user + same input returns cached result", () => {
  it("returns the cached value on the second call with identical input", async () => {
    // First call — cache miss, AI called, result saved
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValueOnce(null);

    const firstResult = await nutritionAnalysisService.getNutritionAnalysis(userId, date);
    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(mockNutritionAI);

    // Second call — cache hit
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValueOnce(
      makeCachedDoc(mockNutritionAI)
    );

    const secondResult = await nutritionAnalysisService.getNutritionAnalysis(userId, date);
    // Still only called once total
    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(1);
    expect(secondResult).toEqual(mockNutritionAI);
  });
});

// ===========================================================================
// Test 4: Different user cannot access another user's cached analysis
// ===========================================================================
describe("Test 4: User isolation — different users get separate cache queries", () => {
  it("queries findValid with the correct userId for each user", async () => {
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);
    await nutritionAnalysisService.getNutritionAnalysis(otherUserId, date);

    const calls = (aiAnalysisCacheRepository.findValid as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);

    // Each call is scoped to its own userId
    expect(calls[0][0].userId).toBe(userId);
    expect(calls[1][0].userId).toBe(otherUserId);

    // Both IDs are different
    expect(calls[0][0].userId).not.toBe(calls[1][0].userId);

    // AI is called twice (separate cache misses for separate users)
    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// Test 5: Changed inputHash causes regeneration (calls AIProvider again)
// ===========================================================================
describe("Test 5: Changed inputHash causes regeneration", () => {
  it("calls AIProvider again when context changes (different date)", async () => {
    const date2 = "2024-05-02";

    // Both calls are cache misses (different dates → different hashes)
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);
    await nutritionAnalysisService.getNutritionAnalysis(userId, date2);

    // AIProvider called twice for two distinct cache misses
    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(2);

    // findValid called with different dates
    const calls = (aiAnalysisCacheRepository.findValid as jest.Mock).mock.calls;
    expect(calls[0][0].date).toBe(date);
    expect(calls[1][0].date).toBe(date2);
  });
});

// ===========================================================================
// Test 6: Failed AIProvider response is NOT saved to cache
// ===========================================================================
describe("Test 6: Failed AIProvider response is NOT cached", () => {
  it("does not call aiAnalysisCacheRepository.save when AIProvider throws", async () => {
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockRejectedValue(
      new Error("AI error")
    );

    await expect(
      nutritionAnalysisService.getNutritionAnalysis(userId, date)
    ).rejects.toThrow("AI analysis is temporarily unavailable.");

    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Test 7: 429 quota exhaustion → classifyGeminiError.isQuotaExhausted = true
// ===========================================================================
describe("Test 7: classifyGeminiError correctly classifies 429 / RESOURCE_EXHAUSTED", () => {
  it("returns isQuotaExhausted=true for RESOURCE_EXHAUSTED messages", () => {
    const err = new Error("RESOURCE_EXHAUSTED: Quota exceeded");
    const result = classifyGeminiError(err);
    expect(result.isQuotaExhausted).toBe(true);
    expect(result.isRateLimit).toBe(true);
  });

  it("returns isQuotaExhausted=true for 429 messages", () => {
    const err = new Error("Error 429: Too many requests");
    const result = classifyGeminiError(err);
    expect(result.isQuotaExhausted).toBe(true);
  });

  it("returns isQuotaExhausted=true for 'quota' messages", () => {
    const err = new Error("Daily quota limit reached");
    const result = classifyGeminiError(err);
    expect(result.isQuotaExhausted).toBe(true);
  });

  it("returns isQuotaExhausted=false for unrelated errors", () => {
    const err = new Error("Network timeout");
    const result = classifyGeminiError(err);
    expect(result.isQuotaExhausted).toBe(false);
    expect(result.isRateLimit).toBe(false);
  });

  it("handles non-Error values gracefully", () => {
    const result = classifyGeminiError("some string");
    expect(result.isQuotaExhausted).toBe(false);
    expect(result.isRateLimit).toBe(false);
    expect(result.retryAfterMs).toBeNull();
  });
});

// ===========================================================================
// Test 8: Quota exhaustion does not cause retry — AIProvider called only once
// ===========================================================================
describe("Test 8: Quota exhaustion does not cause retry", () => {
  it("calls AIProvider.generateNutritionAnalysis exactly once even on quota exhaustion", async () => {
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    const quotaError = new Error("RESOURCE_EXHAUSTED: quota exceeded");
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockRejectedValue(quotaError);

    await expect(
      nutritionAnalysisService.getNutritionAnalysis(userId, date)
    ).rejects.toThrow("AI analysis is temporarily unavailable.");

    // Called exactly once — no retry on quota exhaustion
    expect(AIProvider.generateNutritionAnalysis).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// Test 9: Daily Summary uses cached sub-analysis results
// ===========================================================================
describe("Test 9: Daily Summary uses cached sub-analysis results", () => {
  it("uses sub-analysis DTOs returned from cache-first sub-services", async () => {
    // Sub-services are fully mocked at module level — they return immediately
    // (the daily summary service calls them and uses their DTOs as context)
    const cachedProgress = { summary: "cached progress", positives: [], attention: [], nextAction: "" };
    const cachedNutrition = { summary: "cached nutrition", positives: [], attention: [], nextAction: "" };
    const cachedWorkout = { summary: "cached workout", positives: [], attention: [], nextAction: "" };
    const cachedReadiness = { summary: "cached readiness", positives: [], attention: [], nextAction: "" };

    // Because dailySummary.service imports them directly, we need to mock their methods
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue(cachedProgress);
    
    jest.spyOn(nutritionAnalysisService, "getNutritionAnalysis").mockResolvedValue(cachedNutrition);
    jest.spyOn(workoutAnalysisService, "getWorkoutAnalysis").mockResolvedValue(cachedWorkout);
    jest.spyOn(readinessAnalysisService, "getReadinessAnalysis").mockResolvedValue(cachedReadiness);

    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue(mockDailySummaryAI);

    await dailySummaryService.getDailySummary(userId, date);

    // The context passed to generateDailySummary should include the sub-analysis DTOs
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.date).toBe(date);
    expect(callArgs.progressAnalysis).toEqual(cachedProgress);
    expect(callArgs.nutritionAnalysis).toEqual(cachedNutrition);
    expect(callArgs.workoutAnalysis).toEqual(cachedWorkout);
    expect(callArgs.readinessAnalysis).toEqual(cachedReadiness);

    // Restore spies
    jest.restoreAllMocks();
  });
});

// ===========================================================================
// Test 10: Deterministic readiness fallback — no AIProvider call for no_history
// ===========================================================================
describe("Test 10: Deterministic readiness fallback (no_history)", () => {
  it("returns no_history fallback without calling AIProvider or cache", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      overallScore: 0,
      status: "no_history",
      recommendation: { muscleGroups: [], reason: "No history" },
      muscleGroups: [],
    });

    const result = await readinessAnalysisService.getReadinessAnalysis(userId);

    expect(AIProvider.generateReadinessAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.findValid).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
    expect(result.summary).toContain("You don't have enough training history");
  });

  it("also returns fallback when trainingReadiness is null", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);

    const result = await readinessAnalysisService.getReadinessAnalysis(userId);

    expect(AIProvider.generateReadinessAnalysis).not.toHaveBeenCalled();
    expect(result.positives).toContain("You are ready to begin your fitness journey!");
  });
});

// ===========================================================================
// Test 11: Deterministic nutrition fallback — zero entries, no AIProvider call
// ===========================================================================
describe("Test 11: Deterministic nutrition fallback (zero entries)", () => {
  it("returns 'No nutrition logged' without calling AIProvider or cache", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue(nutritionSummaryEmpty);

    const result = await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    expect(AIProvider.generateNutritionAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.findValid).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
    expect(result.summary).toContain("No nutrition logged for today");
    expect(result.nextAction).toContain("Log your meals");
  });
});

// ===========================================================================
// Test 12: Deterministic workout fallback — new user, no AIProvider call
// ===========================================================================
describe("Test 12: Deterministic workout fallback (new user)", () => {
  it("returns 'No workout history' without calling AIProvider or cache", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({
      insights: [],
      personalRecords: [],
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);

    const result = await workoutAnalysisService.getWorkoutAnalysis(userId, date);

    expect(AIProvider.generateWorkoutAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.findValid).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
    expect(result.summary).toContain("No workout history available yet");
    expect(result.nextAction).toContain("Complete your first workout");
  });
});
