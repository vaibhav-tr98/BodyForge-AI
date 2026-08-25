import { progressAnalysisService } from "../progressAnalysis.service";
import { AIProvider } from "../aiProvider.service";
import { progressService } from "../progress.service";
import { analyticsService } from "../analytics.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { nutritionService } from "../nutrition.service";
import { userRepository } from "../../repositories/user.repository";
import { progressInsightService } from "../progressInsight.service";

jest.mock("../aiProvider.service");
jest.mock("../progress.service");
jest.mock("../analytics.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../nutrition.service");
jest.mock("../../repositories/user.repository");
jest.mock("../progressInsight.service");

describe("ProgressAnalysisService", () => {
  const userId = "testUser123";
  const date = "2024-03-01";

  beforeEach(() => {
    jest.clearAllMocks();

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

});
