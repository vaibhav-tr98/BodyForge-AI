import { nutritionAnalysisService } from "../nutritionAnalysis.service";
import { AIProvider } from "../aiProvider.service";
import { nutritionService } from "../nutrition.service";
import { nutritionTargetService } from "../nutritionTarget.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { userRepository } from "../../repositories/user.repository";
import { aiAnalysisCacheRepository } from "../../repositories/aiAnalysisCache.repository";

jest.mock("../aiProvider.service");
jest.mock("../nutrition.service");
jest.mock("../nutritionTarget.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../../repositories/user.repository");
jest.mock("../../repositories/aiAnalysisCache.repository");

describe("NutritionAnalysisService", () => {
  const userId = "testUser123";
  const date = "2024-03-01";

  beforeEach(() => {
    jest.clearAllMocks();

    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: userId, fitnessGoal: "lose_fat" });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: null });
    // Default: cache miss so existing tests hit the AI path
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (aiAnalysisCacheRepository.save as jest.Mock).mockResolvedValue({});
  });

  it("returns explicit message when no nutrition entries exist", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });

    const result = await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    expect(AIProvider.generateNutritionAnalysis).not.toHaveBeenCalled();
    expect(result.summary).toContain("No nutrition logged for today");
  });

  it("handles missing nutrition targets explicitly", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1500, totalProtein: 100, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue(null);
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "No targets", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.calorieTarget).toBeNull();
    expect(callArgs.caloriePercentage).toBeNull();
  });

  it("handles protein below target", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 2000, totalProtein: 80, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.proteinConsumed).toBe(80);
    expect(callArgs.proteinTarget).toBe(160);
    expect(callArgs.proteinPercentage).toBe(50); // 80/160 * 100
  });

  it("handles calories below target", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1000, totalProtein: 80, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.nutritionStatus).toBe("below_target");
  });

  it("handles nutrition on track", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1800, totalProtein: 150, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.nutritionStatus).toBe("on_track"); // 1800 >= 2000 * 0.85 (1700)
  });

  it("handles workout available", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1500, totalProtein: 100, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: { workoutName: "Leg Day" } });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.workoutRecommendationName).toBe("Leg Day");
  });

  it("handles no workout recommendation", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1500, totalProtein: 100, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: null });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.workoutRecommendationName).toBeNull();
  });

  it("produces controlled error behavior on AI failure", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1500, totalProtein: 100, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(nutritionAnalysisService.getNutritionAnalysis(userId, date)).rejects.toThrow("AI analysis is temporarily unavailable.");
  });

  it("correctly constructs structured context and user isolation", async () => {
    (nutritionService.getSummary as jest.Mock).mockResolvedValue({ date, totalCalories: 1500, totalProtein: 100, totalCarbs: 150, totalFat: 50 });
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({ calories: 2000, protein: 160 });
    (AIProvider.generateNutritionAnalysis as jest.Mock).mockResolvedValue({ summary: "Good", positives: [], attention: [], nextAction: "" });

    await nutritionAnalysisService.getNutritionAnalysis(userId, date);

    const callArgs = (AIProvider.generateNutritionAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.password).toBeUndefined();
    expect(callArgs.email).toBeUndefined();
    expect(callArgs.date).toBe(date); // Date isolation
    expect(nutritionService.getSummary).toHaveBeenCalledWith(userId, date); // User and date isolation
  });
});
