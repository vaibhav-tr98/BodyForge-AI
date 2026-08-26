import { workoutAnalysisService } from "../workoutAnalysis.service";
import { AIProvider } from "../aiProvider.service";
import { analyticsService } from "../analytics.service";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { userRepository } from "../../repositories/user.repository";

jest.mock("../aiProvider.service");
jest.mock("../analytics.service");
jest.mock("../workoutRecommendation.service");
jest.mock("../../repositories/user.repository");

describe("WorkoutAnalysisService", () => {
  const userId = "testUser123";
  const date = "2024-03-01";

  beforeEach(() => {
    jest.clearAllMocks();
    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: userId });
  });

  it("returns explicit message when no workout history exists", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ insights: [] });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);

    const result = await workoutAnalysisService.getWorkoutAnalysis(userId, date);

    expect(AIProvider.generateWorkoutAnalysis).not.toHaveBeenCalled();
    expect(result.summary).toContain("No workout history available yet");
  });

  it("handles insufficient workout history (e.g. no recommendation, but some insights)", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ insights: ["You did something"] });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);
    
    (AIProvider.generateWorkoutAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI summary",
      positives: [],
      attention: [],
      nextAction: "AI next action"
    });

    await workoutAnalysisService.getWorkoutAnalysis(userId, date);
    
    const callArgs = (AIProvider.generateWorkoutAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.overallReadinessScore).toBeNull();
    expect(callArgs.todayWorkoutRecommendationName).toBeNull();
  });

  it("handles workout recommendation available", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({ overallScore: 80, status: "ready", muscleGroups: [] });
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ insights: [] });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: { workoutName: "Pull Day", reason: "Pull day is due" } });
    
    (AIProvider.generateWorkoutAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI summary",
      positives: [],
      attention: [],
      nextAction: "AI next action"
    });

    await workoutAnalysisService.getWorkoutAnalysis(userId, date);
    
    const callArgs = (AIProvider.generateWorkoutAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.todayWorkoutRecommendationName).toBe("Pull Day");
    expect(callArgs.todayWorkoutRecommendationReason).toBe("Pull day is due");
  });

  it("handles missing optional workout metrics gracefully", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({ 
      overallScore: 80, 
      status: "ready", 
      muscleGroups: [
        { muscle: "Chest", status: "ready", sessionsLast7Days: 2, sessionsLast14Days: 4 }
      ] 
    });
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue(null);
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);
    
    (AIProvider.generateWorkoutAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI summary",
      positives: [],
      attention: [],
      nextAction: "AI next action"
    });

    await workoutAnalysisService.getWorkoutAnalysis(userId, date);
    
    const callArgs = (AIProvider.generateWorkoutAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.recentWorkoutCount7Days).toBe(2);
    expect(callArgs.recentPRs).toBeNull();
  });

  it("produces controlled error behavior on AI failure", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({ overallScore: 80, status: "ready", muscleGroups: [] });
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ insights: [] });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);
    
    (AIProvider.generateWorkoutAnalysis as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(workoutAnalysisService.getWorkoutAnalysis(userId, date)).rejects.toThrow("AI analysis is temporarily unavailable.");
  });

  it("correctly constructs structured context and user isolation", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({ overallScore: 80, status: "ready", muscleGroups: [] });
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ insights: [] });
    (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue(null);
    
    (AIProvider.generateWorkoutAnalysis as jest.Mock).mockResolvedValue({
      summary: "AI summary",
      positives: [],
      attention: [],
      nextAction: "AI next action"
    });

    await workoutAnalysisService.getWorkoutAnalysis(userId, date);
    
    const callArgs = (AIProvider.generateWorkoutAnalysis as jest.Mock).mock.calls[0][0];
    expect(callArgs.password).toBeUndefined(); // Verify user isolation and no sensitive data
    expect(callArgs.date).toBe(date); 
    
    expect(analyticsService.getTrainingReadiness).toHaveBeenCalledWith(userId); // Ensure userId is passed for isolation
    expect(workoutRecommendationService.getTodayRecommendation).toHaveBeenCalledWith(userId, date);
  });
});
