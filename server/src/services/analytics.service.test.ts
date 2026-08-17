import { AnalyticsService } from "./analytics.service";

// Mock dependencies
jest.mock("../repositories/workoutSession.repository", () => ({
  workoutSessionRepository: {
    getDashboardAggregations: jest.fn(),
    getUserWorkoutDates: jest.fn(),
    getRecentCompletedSessions: jest.fn(),
    findByIdAndUser: jest.fn(),
    aggregateExerciseProgress: jest.fn(),
  },
}));

jest.mock("./progression.service", () => ({
  progressionService: {
    getRecommendation: jest.fn(),
  },
}));

import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { progressionService } from "./progression.service";

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    jest.clearAllMocks();
  });

  describe("calculateStreak", () => {
    it("should return 0 for no workout dates", () => {
      // Access private method for testing using type assertion
      const streak = (analyticsService as any).calculateStreak([]);
      expect(streak).toBe(0);
    });

    it("should return 1 for a workout done today", () => {
      const today = new Date();
      const streak = (analyticsService as any).calculateStreak([today]);
      expect(streak).toBe(1);
    });

    it("should return 1 for a workout done yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const streak = (analyticsService as any).calculateStreak([yesterday]);
      expect(streak).toBe(1);
    });

    it("should calculate correct streak for consecutive days ending yesterday", () => {
      const dates = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d);
      }
      const streak = (analyticsService as any).calculateStreak(dates);
      expect(streak).toBe(3);
    });

    it("should break streak if a day is skipped", () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const streak = (analyticsService as any).calculateStreak([today, yesterday, threeDaysAgo]);
      expect(streak).toBe(2); // Only today and yesterday count
    });
  });

  describe("getDashboardAnalytics", () => {
    it("should assemble dashboard analytics correctly", async () => {
      const userId = "testUser123";

      const mockAggregations = { totalWorkouts: 10, workoutsThisWeek: 3, totalVolume: 15000, totalExercises: 50 };
      const mockDates = [new Date()]; // streak of 1
      const mockRecent = [
        {
          _id: "session1",
          workoutName: "Chest Day",
          completedAt: new Date(),
          exerciseCount: 5,
          totalVolume: 5000,
        },
      ];

      (workoutSessionRepository.getDashboardAggregations as jest.Mock).mockResolvedValue(mockAggregations);
      (workoutSessionRepository.getUserWorkoutDates as jest.Mock).mockResolvedValue(mockDates);
      (workoutSessionRepository.getRecentCompletedSessions as jest.Mock).mockResolvedValue(mockRecent);
      (workoutSessionRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      const result = await analyticsService.getDashboardAnalytics(userId);

      expect(result.summary.totalWorkouts).toBe(10);
      expect(result.summary.currentStreak).toBe(1);
      expect(result.recentWorkouts).toHaveLength(1);
      expect(result.recentWorkouts[0].workoutName).toBe("Chest Day");
      expect(result.progressionRecommendation).toBeNull();
    });
  });
});
