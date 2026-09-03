import { progressAnalysisService } from "../progressAnalysis.service";
import { AIProvider } from "../aiProvider.service";
import { progressService } from "../progress.service";
import { analyticsService } from "../analytics.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { nutritionService } from "../nutrition.service";
import { userRepository } from "../../repositories/user.repository";
import { progressInsightService } from "../progressInsight.service";
import { aiAnalysisCacheRepository } from "../../repositories/aiAnalysisCache.repository";

jest.mock("../aiProvider.service");
jest.mock("../progress.service");
jest.mock("../analytics.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../nutrition.service");
jest.mock("../../repositories/user.repository");
jest.mock("../progressInsight.service");
jest.mock("../../repositories/aiAnalysisCache.repository");

describe("ProgressAnalysisService", () => {
  const userId = "testUser123";
  const date = "2024-03-01";

  beforeEach(() => {
    jest.clearAllMocks();

    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (aiAnalysisCacheRepository.save as jest.Mock).mockResolvedValue({});
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: null });
    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: userId, age: 30, gender: "male", height: 180, weight: 80, activityLevel: "sedentary", fitnessGoal: "maintain" });
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    (progressInsightService.getProgressInsight as jest.Mock).mockResolvedValue({ message: "Insight" });
  });

  it("returns deterministic fallback when no progress history", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([]);

    const result = await progressAnalysisService.getProgressAnalysis(userId, date);

    expect(AIProvider.generateStructuredAnalysis).not.toHaveBeenCalled();
    expect(result.summary).toContain("Add more progress measurements");
    expect(result.positives).toEqual([]);
    expect(result.attention).toEqual([]);
  });

  it("returns insufficient-data fallback for one progress entry", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 80, date: "2024-03-01" }
    ]);

    const result = await progressAnalysisService.getProgressAnalysis(userId, date);

    expect(AIProvider.generateStructuredAnalysis).not.toHaveBeenCalled();
    expect(result.summary).toContain("Add more progress measurements");
  });

  it("calls AI provider when there are two valid progress entries", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, bodyFatPercentage: 14, waist: 80, date: "2024-03-02" },
      { weight: 80, bodyFatPercentage: 15, waist: 82, date: "2024-03-01" }
    ]);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "Good progress", positives: [], attention: [], nextAction: "Keep going"
    });

    const result = await progressAnalysisService.getProgressAnalysis(userId, date);

    expect(AIProvider.generateStructuredAnalysis).toHaveBeenCalled();
    expect(result.summary).toBe("Good progress");
  });

  it("correctly constructs structured context and user isolation", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI Output", positives: [], attention: [], nextAction: "Action"
    });

    await progressAnalysisService.getProgressAnalysis(userId, date);

    const callArgs = (AIProvider.generateStructuredAnalysis as jest.Mock).mock.calls[0][0];
    
    // Check structured context is correct
    expect(callArgs.currentWeight).toBe(79);
    expect(callArgs.previousWeight).toBe(80);
    expect(callArgs.weightChange).toBe(-1); // 79 - 80 = -1
    expect(callArgs.daysTracked).toBe(2);

    // No sensitive user data/password/jwt
    expect(callArgs.password).toBeUndefined();
    expect(callArgs.email).toBeUndefined();
  });

  it("handles missing optional metrics correctly", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" }, // No bodyFat or waist
      { weight: 80, date: "2024-03-01" }
    ]);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI Output", positives: [], attention: [], nextAction: "Action"
    });

    await progressAnalysisService.getProgressAnalysis(userId, date);

    const callArgs = (AIProvider.generateStructuredAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.currentBodyFat).toBeNull();
    expect(callArgs.bodyFatChange).toBeNull();
    expect(callArgs.currentWaist).toBeNull();
    expect(callArgs.waistChange).toBeNull();
  });

  it("produces controlled error behavior on AI failure", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(progressAnalysisService.getProgressAnalysis(userId, date)).rejects.toThrow("AI analysis is temporarily unavailable.");
  });

  // --- Cache tests ---

  it("calls AIProvider once and saves result on cache miss", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI Output", positives: [], attention: [], nextAction: "Action"
    });

    await progressAnalysisService.getProgressAnalysis(userId, date);

    expect(AIProvider.generateStructuredAnalysis).toHaveBeenCalledTimes(1);
    expect(aiAnalysisCacheRepository.save).toHaveBeenCalledTimes(1);
    
    const saveArgs = (aiAnalysisCacheRepository.save as jest.Mock).mock.calls[0][0];
    expect(saveArgs.type).toBe("progress");
    expect(saveArgs.userId).toBe(userId);
  });

  it("does not call AIProvider on cache hit", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    const cachedResult = { summary: "Cached output", positives: [], attention: [], nextAction: "" };
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue({ result: cachedResult });

    const result = await progressAnalysisService.getProgressAnalysis(userId, date);

    expect(AIProvider.generateStructuredAnalysis).not.toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
  });

  it("regenerates (calls AI again) when context changes", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI Output", positives: [], attention: [], nextAction: "Action"
    });

    await progressAnalysisService.getProgressAnalysis(userId, date);
    await progressAnalysisService.getProgressAnalysis(userId, "2024-05-02"); // different date

    expect(AIProvider.generateStructuredAnalysis).toHaveBeenCalledTimes(2);
  });

  it("does not save to cache if AI fails", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(progressAnalysisService.getProgressAnalysis(userId, date)).rejects.toThrow("AI analysis is temporarily unavailable.");

    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
  });

  it("isolates cache checks by user ID", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, date: "2024-03-02" },
      { weight: 80, date: "2024-03-01" }
    ]);
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateStructuredAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI Output", positives: [], attention: [], nextAction: "Action"
    });

    const otherUserId = "user456";
    await progressAnalysisService.getProgressAnalysis(userId, date);
    await progressAnalysisService.getProgressAnalysis(otherUserId, date);

    const calls = (aiAnalysisCacheRepository.findValid as jest.Mock).mock.calls;
    expect(calls[0][0].userId).toBe(userId);
    expect(calls[1][0].userId).toBe(otherUserId);
    expect(AIProvider.generateStructuredAnalysis).toHaveBeenCalledTimes(2);
  });
});
