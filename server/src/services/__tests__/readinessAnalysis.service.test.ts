import { readinessAnalysisService } from "../readinessAnalysis.service";
import { analyticsService } from "../analytics.service";
import { AIProvider } from "../aiProvider.service";

jest.mock("../analytics.service");
jest.mock("../aiProvider.service");

describe("ReadinessAnalysisService", () => {
  const userId = "test-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return deterministic fallback when no training history exists", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      overallScore: 0,
      status: "no_history",
      recommendation: { muscleGroups: [], reason: "Build more training history" },
      muscleGroups: []
    });

    const result = await readinessAnalysisService.getReadinessAnalysis(userId);

    expect(AIProvider.generateReadinessAnalysis).not.toHaveBeenCalled();
    expect(result.summary).toContain("You don't have enough training history");
  });

  it("should call AI provider with valid readiness data", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      overallScore: 85,
      status: "ready",
      recommendation: { muscleGroups: ["Chest", "Back"], reason: "Well rested" },
      muscleGroups: [
        { muscle: "Chest", readinessScore: 100, status: "ready", daysSinceLastTrained: 5 }
      ]
    });

    (AIProvider.generateReadinessAnalysis as jest.Mock).mockResolvedValue({
      summary: "You are fully recovered.",
      positives: ["Chest is fully ready"],
      attention: [],
      nextAction: "Train chest"
    });

    const result = await readinessAnalysisService.getReadinessAnalysis(userId);

    expect(AIProvider.generateReadinessAnalysis).toHaveBeenCalled();
    const contextArg = (AIProvider.generateReadinessAnalysis as jest.Mock).mock.calls[0][0];
    expect(contextArg.overallScore).toBe(85);
    expect(contextArg.status).toBe("ready");
    expect(contextArg.recommendationReason).toBe("Well rested");
    expect(contextArg.muscleGroups[0].muscle).toBe("Chest");
    expect(result.summary).toBe("You are fully recovered.");
  });

  it("should throw a friendly error when AI provider fails", async () => {
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      overallScore: 85,
      status: "ready",
      recommendation: { muscleGroups: ["Chest"], reason: "Well rested" },
      muscleGroups: []
    });

    (AIProvider.generateReadinessAnalysis as jest.Mock).mockRejectedValue(new Error("AI error"));

    await expect(readinessAnalysisService.getReadinessAnalysis(userId)).rejects.toThrow("AI analysis is temporarily unavailable.");
  });
});
