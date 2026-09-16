import { aiCoachingService } from "../../src/services/aiCoaching.service";
import { userRepository } from "../../src/repositories/user.repository";
import { workoutSessionRepository } from "../../src/repositories/workoutSession.repository";
import { analyticsService } from "../../src/services/analytics.service";
import { nutritionService } from "../../src/services/nutrition.service";
import { aiAnalysisCacheRepository } from "../../src/repositories/aiAnalysisCache.repository";
import { AIProvider } from "../../src/services/aiProvider.service";
import { hashContext } from "../../src/utils/hashContext";

jest.mock("../../src/repositories/user.repository");
jest.mock("../../src/repositories/workoutSession.repository");
jest.mock("../../src/services/analytics.service");
jest.mock("../../src/services/nutrition.service");
jest.mock("../../src/services/nutritionTarget.service", () => ({
  nutritionTargetService: {
    calculateTargets: jest.fn().mockReturnValue({ calories: 2000, protein: 150 })
  }
}));
jest.mock("../../src/services/progress.service", () => ({
  progressService: {
    getProgressHistory: jest.fn().mockResolvedValue([])
  }
}));
jest.mock("../../src/repositories/aiAnalysisCache.repository");
jest.mock("../../src/services/aiProvider.service");

describe("AICoachingService", () => {
  const mockUserId = "user-123";
  const mockDate = "2023-10-01";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return cached coaching if valid", async () => {
    const mockCachedResponse = { summary: "Cached" };
    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: mockUserId });
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.getRecentCompletedSessions as jest.Mock).mockResolvedValue([]);
    (nutritionService.getSummary as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.findActiveSession as jest.Mock).mockResolvedValue(null);
    
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue({ result: mockCachedResponse });

    const result = await aiCoachingService.getCoaching(mockUserId, mockDate);

    expect(result).toEqual(mockCachedResponse);
    expect(AIProvider.generateCoaching).not.toHaveBeenCalled();
  });

  it("should call AI provider on cache miss and save to cache", async () => {
    const mockAIResponse = { summary: "New" };
    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: mockUserId });
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.getRecentCompletedSessions as jest.Mock).mockResolvedValue([]);
    (nutritionService.getSummary as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.findActiveSession as jest.Mock).mockResolvedValue(null);
    
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateCoaching as jest.Mock).mockResolvedValue(mockAIResponse);

    const result = await aiCoachingService.getCoaching(mockUserId, mockDate);

    expect(result).toEqual(mockAIResponse);
    expect(AIProvider.generateCoaching).toHaveBeenCalled();
    expect(aiAnalysisCacheRepository.save).toHaveBeenCalled();
  });

  it("should not cache if AI provider throws", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({ _id: mockUserId });
    (aiAnalysisCacheRepository.findValid as jest.Mock).mockResolvedValue(null);
    (AIProvider.generateCoaching as jest.Mock).mockRejectedValue(new Error("AI Error"));

    await expect(aiCoachingService.getCoaching(mockUserId, mockDate)).rejects.toThrow("AI Coach is currently resting.");
    expect(aiAnalysisCacheRepository.save).not.toHaveBeenCalled();
  });
});
