import { dailySummaryService } from "../dailySummary.service";
import { AIProvider } from "../aiProvider.service";
import { progressAnalysisService } from "../progressAnalysis.service";
import { nutritionAnalysisService } from "../nutritionAnalysis.service";
import { workoutAnalysisService } from "../workoutAnalysis.service";
import { readinessAnalysisService } from "../readinessAnalysis.service";
import { aiAnalysisCacheRepository } from "../../repositories/aiAnalysisCache.repository";

jest.mock("../aiProvider.service");
jest.mock("../progressAnalysis.service");
jest.mock("../nutritionAnalysis.service");
jest.mock("../workoutAnalysis.service");
jest.mock("../readinessAnalysis.service");
jest.mock("../../repositories/aiAnalysisCache.repository");

describe("DailySummaryService", () => {
  const userId = "testUser123";
  const date = "2024-03-01";

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cache miss so existing tests hit the AI path
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (aiAnalysisCacheRepository.save as jest.Mock).mockResolvedValue({});
  });

  it("successfully generates summary with full data", async () => {
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "progress ok" });
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "nutrition ok" });
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockResolvedValue({ summary: "workout ok" });
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockResolvedValue({ summary: "readiness ok" });

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "All good",
      topPositive: "You are doing great",
      mainAttention: "Sleep more",
      nextAction: "Go to bed"
    });

    const result = await dailySummaryService.getDailySummary(userId, date);

    expect(result.summary).toBe("All good");
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.progressAnalysis).toEqual({ summary: "progress ok" });
    expect(callArgs.nutritionAnalysis).toEqual({ summary: "nutrition ok" });
    expect(callArgs.workoutAnalysis).toEqual({ summary: "workout ok" });
    expect(callArgs.readinessAnalysis).toEqual({ summary: "readiness ok" });
  });

  it("handles missing progress data gracefully", async () => {
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockRejectedValue(new Error("Progress failed"));
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "nutrition ok" });
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockResolvedValue({ summary: "workout ok" });
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockResolvedValue({ summary: "readiness ok" });

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "Summary without progress",
      topPositive: "pos",
      mainAttention: "att",
      nextAction: "action"
    });

    const result = await dailySummaryService.getDailySummary(userId, date);
    expect(result.summary).toBe("Summary without progress");
    
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.progressAnalysis).toBeNull();
    expect(callArgs.nutritionAnalysis).toBeDefined();
  });

  it("handles missing nutrition data gracefully", async () => {
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "progress ok" });
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockRejectedValue(new Error("Nutrition failed"));
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockResolvedValue({ summary: "workout ok" });
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockResolvedValue({ summary: "readiness ok" });

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "Summary without nutrition",
      topPositive: "pos",
      mainAttention: "att",
      nextAction: "action"
    });

    await dailySummaryService.getDailySummary(userId, date);
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.nutritionAnalysis).toBeNull();
  });

  it("handles missing workout data gracefully", async () => {
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "progress ok" });
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "nutrition ok" });
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockRejectedValue(new Error("Workout failed"));
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockResolvedValue({ summary: "readiness ok" });

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "Summary without workout",
      topPositive: "pos",
      mainAttention: "att",
      nextAction: "action"
    });

    await dailySummaryService.getDailySummary(userId, date);
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.workoutAnalysis).toBeNull();
  });

  it("handles missing readiness data gracefully", async () => {
    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "progress ok" });
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "nutrition ok" });
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockResolvedValue({ summary: "workout ok" });
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockRejectedValue(new Error("Readiness failed"));

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "Summary without readiness",
      topPositive: "pos",
      mainAttention: "att",
      nextAction: "action"
    });

    await dailySummaryService.getDailySummary(userId, date);
    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.readinessAnalysis).toBeNull();
  });

  it("produces controlled error behavior on AI failure", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const date = "2023-11-20";

    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "mock" });
    (AIProvider.generateDailySummary as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(dailySummaryService.getDailySummary(userId, date)).rejects.toThrow("AI analysis is temporarily unavailable.");
  });

  it("correctly constructs structured context and isolates by user and date", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const date = "2023-11-20";

    (AIProvider.generateDailySummary as jest.Mock).mockResolvedValue({
      summary: "Test",
      topPositive: "Test",
      mainAttention: "Sleep",
      nextAction: "Go to bed"
    });

    (progressAnalysisService.getProgressAnalysis as jest.Mock).mockResolvedValue({ summary: "mock" });
    (nutritionAnalysisService.getNutritionAnalysis as jest.Mock).mockResolvedValue(null);
    (workoutAnalysisService.getWorkoutAnalysis as jest.Mock).mockResolvedValue(null);
    (readinessAnalysisService.getReadinessAnalysis as jest.Mock).mockResolvedValue(null);

    await dailySummaryService.getDailySummary(userId, date);

    expect(progressAnalysisService.getProgressAnalysis).toHaveBeenCalledWith(userId, date);
    expect(nutritionAnalysisService.getNutritionAnalysis).toHaveBeenCalledWith(userId, date);
    expect(workoutAnalysisService.getWorkoutAnalysis).toHaveBeenCalledWith(userId, date);
    expect(readinessAnalysisService.getReadinessAnalysis).toHaveBeenCalledWith(userId);

    const callArgs = (AIProvider.generateDailySummary as jest.Mock).mock.calls[0][0];
    expect(callArgs.date).toBe(date);
    expect(callArgs.password).toBeUndefined();
  });
});
