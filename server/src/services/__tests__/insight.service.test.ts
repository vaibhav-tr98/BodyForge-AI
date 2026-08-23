import { insightService } from "../insight.service";
import { analyticsService } from "../analytics.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { nutritionService } from "../nutrition.service";

jest.mock("../analytics.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../nutrition.service");

describe("InsightService", () => {
  const userId = "test-user-id";
  const date = "2026-08-23";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return history_needed if readiness is no_history", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      status: "no_history",
      overallScore: 0,
      muscleGroups: []
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
      recommendation: null
    });
    (nutritionService.getTodayOverview as jest.Mock).mockResolvedValue({
      targets: null,
      status: { protein: "no_target", calories: "no_target" }
    });

    const result = await insightService.getInsight(userId, date);
    expect(result.type).toBe("history_needed");
    expect(result.priority).toBe("high");
  });

  it("should return nutrition_config_needed if nutrition targets are null", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      status: "ready",
      overallScore: 100,
      muscleGroups: []
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
      recommendation: null
    });
    (nutritionService.getTodayOverview as jest.Mock).mockResolvedValue({
      targets: null,
      status: { protein: "no_target", calories: "no_target" }
    });

    const result = await insightService.getInsight(userId, date);
    expect(result.type).toBe("nutrition_config_needed");
    expect(result.priority).toBe("high");
  });

  it("should return nutrition_gap if protein is below target", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      status: "ready",
      overallScore: 100,
      muscleGroups: []
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
      recommendation: { workoutName: "Push Day" }
    });
    (nutritionService.getTodayOverview as jest.Mock).mockResolvedValue({
      targets: { protein: 150, calories: 2500 },
      status: { protein: "below_target", calories: "on_track" },
      progress: { proteinPercent: 50, caloriesPercent: 90 }
    });

    const result = await insightService.getInsight(userId, date);
    expect(result.type).toBe("nutrition_gap");
    expect(result.priority).toBe("medium");
    expect(result.title).toBe("Protein needs attention");
    expect(result.message).toContain("protein intake is currently below today's target");
  });

  it("should return on_track if workout available and nutrition is on track", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      status: "ready",
      overallScore: 100,
      muscleGroups: []
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
      recommendation: { workoutName: "Pull Day" }
    });
    (nutritionService.getTodayOverview as jest.Mock).mockResolvedValue({
      targets: { protein: 150, calories: 2500 },
      status: { protein: "on_track", calories: "on_track" },
      progress: { proteinPercent: 95, caloriesPercent: 90 }
    });

    const result = await insightService.getInsight(userId, date);
    expect(result.type).toBe("on_track");
    expect(result.priority).toBe("low");
  });

  it("should return no_workout if no workout is recommended and nutrition is fine", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      status: "ready",
      overallScore: 100,
      muscleGroups: []
    });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({
      recommendation: null
    });
    (nutritionService.getTodayOverview as jest.Mock).mockResolvedValue({
      targets: { protein: 150, calories: 2500 },
      status: { protein: "on_track", calories: "on_track" },
      progress: { proteinPercent: 90, caloriesPercent: 90 }
    });

    const result = await insightService.getInsight(userId, date);
    expect(result.type).toBe("no_workout");
    expect(result.priority).toBe("low");
  });
});
