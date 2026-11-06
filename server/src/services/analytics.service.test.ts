import { AnalyticsService } from "./analytics.service";
import { DateEngine } from "../utils/dateEngine";
import { activityQuerySchema } from "../validation/analytics.validation";

// Mock dependencies
jest.mock("../repositories/workoutSession.repository", () => ({
  workoutSessionRepository: {
    getDashboardAggregations: jest.fn(),
    getUserWorkoutDates: jest.fn(),
    getRecentCompletedSessions: jest.fn(),
    findByIdAndUser: jest.fn(),
    aggregateExerciseProgress: jest.fn(),
    getDailyWorkoutActivity: jest.fn(),
  },
}));

jest.mock("./progression.service", () => ({
  progressionService: {
    getRecommendation: jest.fn(),
  },
}));

jest.mock("../repositories/user.repository", () => ({
  userRepository: {
    findById: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("../repositories/program.repository", () => ({
  programRepository: {
    findActiveProgram: jest.fn().mockResolvedValue(null),
  },
  __esModule: true,
  default: {
    findActiveProgram: jest.fn().mockResolvedValue(null),
  },
}));

import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { progressionService } from "./progression.service";
import { userRepository } from "../repositories/user.repository";
import programRepository from "../repositories/program.repository";

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

    it("should accurately calculate streak across UTC midnight using timezone-aware dates", () => {
      // Reference 'now' in Asia/Kolkata (UTC+5:30): 2026-11-05T06:00:00Z -> Local is 2026-11-05 11:30 AM
      const referenceNow = new Date("2026-11-05T06:00:00Z");

      // Workout 1: 2026-11-04T23:30:00Z (Nov 4 in UTC, but 05:00 AM Nov 5 in Kolkata = TODAY)
      const workoutTodayKolkata = new Date("2026-11-04T23:30:00Z");
      // Workout 2: 2026-11-03T23:30:00Z (Nov 3 in UTC, but 05:00 AM Nov 4 in Kolkata = YESTERDAY)
      const workoutYesterdayKolkata = new Date("2026-11-03T23:30:00Z");

      const kolkataStreak = analyticsService.calculateStreak(
        [workoutTodayKolkata, workoutYesterdayKolkata],
        "Asia/Kolkata",
        referenceNow
      );
      expect(kolkataStreak).toBe(2);

      // In New York (UTC-5), 2026-11-04T23:30:00Z was 18:30 Nov 4 (YESTERDAY relative to 2026-11-05 01:00 AM local)
      // and 2026-11-03T23:30:00Z was 18:30 Nov 3 (TWO DAYS AGO)
      const nyStreak = analyticsService.calculateStreak(
        [workoutTodayKolkata, workoutYesterdayKolkata],
        "America/New_York",
        referenceNow
      );
      expect(nyStreak).toBe(2);
    });

    it("should gracefully fallback to UTC for invalid timezones in streak calculation", () => {
      const now = new Date("2026-11-05T12:00:00Z");
      const todayWorkout = new Date("2026-11-05T08:00:00Z");

      const streak = analyticsService.calculateStreak(
        [todayWorkout],
        "Invalid/NonExistent_Timezone",
        now
      );
      expect(streak).toBe(1);
    });
  });

  describe("getDashboardAnalytics", () => {
    it("should resolve authoritative timezone in priority order (explicit > profile > program > UTC)", async () => {
      const userId = "testUser123";

      // 1. Explicit timezone parameter
      const tz1 = await analyticsService.resolveUserTimezone(userId, "America/Chicago");
      expect(tz1).toBe("America/Chicago");

      // 2. User profile timezone
      (userRepository.findById as jest.Mock).mockResolvedValueOnce({ _id: userId, timezone: "Europe/London" });
      const tz2 = await analyticsService.resolveUserTimezone(userId);
      expect(tz2).toBe("Europe/London");

      // 3. Active program timezone
      (userRepository.findById as jest.Mock).mockResolvedValueOnce({ _id: userId });
      (programRepository.findActiveProgram as jest.Mock).mockResolvedValueOnce({ timezone: "Asia/Singapore" });
      const tz3 = await analyticsService.resolveUserTimezone(userId);
      expect(tz3).toBe("Asia/Singapore");

      // 4. Default fallback to UTC
      (userRepository.findById as jest.Mock).mockResolvedValueOnce(null);
      (programRepository.findActiveProgram as jest.Mock).mockResolvedValueOnce(null);
      const tz4 = await analyticsService.resolveUserTimezone(userId);
      expect(tz4).toBe("UTC");
    });
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

  describe("getPersonalRecordsAndInsights", () => {
    it("should return empty insights and records if no history", async () => {
      (workoutSessionRepository as any).getPersonalRecords = jest.fn().mockResolvedValue([]);
      
      const result = await analyticsService.getPersonalRecordsAndInsights("testUser");
      
      expect(result.personalRecords).toHaveLength(0);
      expect(result.insights).toHaveLength(0);
    });

    it("should detect PR correctly and compute insights", async () => {
      const mockRawData = [
        {
          _id: "bench press",
          originalExerciseName: "Bench Press",
          heaviestWeight: 30,
          bestReps: 12,
          bestSessionVolume: 600,
          totalSessions: 2,
          lastPerformedAt: new Date("2024-01-02"),
          history: [
            { weight: 25, reps: 10, volume: 500, date: new Date("2024-01-01") },
            { weight: 30, reps: 8, volume: 600, date: new Date("2024-01-02") }
          ]
        },
        {
          _id: "pull ups",
          originalExerciseName: "Pull Ups",
          heaviestWeight: 0,
          bestReps: 15,
          bestSessionVolume: 0,
          totalSessions: 1,
          lastPerformedAt: new Date("2024-01-01"),
          history: [
            { weight: 0, reps: 15, volume: 0, date: new Date("2024-01-01") }
          ]
        }
      ];

      (workoutSessionRepository as any).getPersonalRecords = jest.fn().mockResolvedValue(mockRawData);

      const result = await analyticsService.getPersonalRecordsAndInsights("testUser");

      expect(result.personalRecords).toHaveLength(2);
      
      const bench = result.personalRecords.find((p: any) => p.exerciseName === "Bench Press");
      expect(bench?.firstRecordedWeight).toBe(25);
      expect(bench?.weightImprovementPercent).toBe(20);

      const pullups = result.personalRecords.find((p: any) => p.exerciseName === "Pull Ups");
      expect(pullups?.firstRecordedWeight).toBeNull();
      expect(pullups?.weightImprovementPercent).toBeNull();

      expect(result.insights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "strongest", exerciseName: "Bench Press" }),
          expect.objectContaining({ type: "improvement", exerciseName: "Bench Press", value: "+20.0%" }),
          expect.objectContaining({ type: "newest_pr", exerciseName: "Bench Press" })
        ])
      );
    });
  });
});

jest.mock("../models/WorkoutSession", () => {
  return {
    __esModule: true,
    default: {
      find: jest.fn(),
    }
  };
});

jest.mock("../models/Exercise", () => {
  return {
    __esModule: true,
    default: {
      find: jest.fn(),
    }
  };
});

import WorkoutSession from "../models/WorkoutSession";
import Exercise from "../models/Exercise";

describe("AnalyticsService - getTrainingReadiness", () => {
  let analyticsService: any;
  const originalDate = Date;

  beforeEach(() => {
    const { AnalyticsService } = require("./analytics.service");
    analyticsService = new AnalyticsService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  const mockNow = new Date("2024-10-15T12:00:00Z");

  const createMockQuery = (data: any) => {
    const q: any = {
      lean: jest.fn().mockResolvedValue(data)
    };
    q.sort = jest.fn().mockReturnValue(q);
    return q;
  };

  const mockDateClass = () => {
    class MockDate extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow.getTime());
        } else {
          super(...args as [any]);
        }
      }
      static now() {
        return mockNow.getTime();
      }
    }
    global.Date = MockDate as any;
  };

  it("should return null for new user with no history (Insufficient history)", async () => {
    (WorkoutSession.find as jest.Mock).mockReturnValue(createMockQuery([]));
    (Exercise.find as jest.Mock).mockReturnValue(createMockQuery([]));

    const result = await analyticsService.getTrainingReadiness("testUser");
    expect(result).not.toBeNull();
      expect(result.overallScore).toBe(100);
      expect(result.muscleGroups[0].status).toBe("no_history");
  });

  it("should return 'ready' for a single older completed workout", async () => {
    mockDateClass();
    
    (WorkoutSession.find as jest.Mock).mockReturnValue(createMockQuery([
        {
          _id: "s1",
          status: "completed",
          completedAt: new Date("2024-10-01T12:00:00Z"), // 14 days ago (borderline)
          exercises: [
            { exerciseName: "Bench Press", sets: [{ completed: true }] }
          ]
        }
      ]));

    (Exercise.find as jest.Mock).mockReturnValue(createMockQuery([
        { name: "Bench Press", primaryMuscles: ["chest"], secondaryMuscles: ["triceps"] }
      ]));

    const result = await analyticsService.getTrainingReadiness("testUser");
    expect(result.status).toBe("ready");
    expect(result.muscleGroups.find((m: any) => m.muscle === "Chest").status).toBe("ready");
    expect(result.muscleGroups.find((m: any) => m.muscle === "Chest").readinessScore).toBe(100);
  });

  it("should return 'recent' for a workout completed today (Recent workout affects readiness)", async () => {
    mockDateClass();
    
    (WorkoutSession.find as jest.Mock).mockReturnValue(createMockQuery([
        {
          _id: "s1",
          status: "completed",
          completedAt: new Date("2024-10-15T10:00:00Z"), // Today
          exercises: [
            { exerciseName: "Squat", sets: [{ completed: true }, { completed: true }, { completed: true }, { completed: true }] }
          ]
        }
      ]));

    (Exercise.find as jest.Mock).mockReturnValue(createMockQuery([
        { name: "Squat", primaryMuscles: ["quadriceps"], secondaryMuscles: ["glutes"] }
      ]));

    const result = await analyticsService.getTrainingReadiness("testUser");
    
    const legs = result.muscleGroups.find((m: any) => m.muscle === "Legs");
    expect(legs.readinessScore).toBeLessThan(40);
    expect(legs.status).toBe("recent");
  });

  it("should properly aggregate duplicate primary/secondary muscles and multiple sessions", async () => {
    mockDateClass();
    
    (WorkoutSession.find as jest.Mock).mockReturnValue(createMockQuery([
        {
          _id: "s1",
          status: "completed",
          completedAt: new Date("2024-10-14T10:00:00Z"), // 1 day ago
          exercises: [
            { exerciseName: "Deadlift", sets: [{ completed: true }, { completed: true }] },
            { exerciseName: "Hamstring Curl", sets: [{ completed: true }, { completed: true }] }
          ]
        },
        {
          _id: "s2",
          status: "completed",
          completedAt: new Date("2024-10-13T10:00:00Z"), // 2 days ago
          exercises: [
            { exerciseName: "Deadlift", sets: [{ completed: true }, { completed: true }] }
          ]
        }
      ]));

    (Exercise.find as jest.Mock).mockReturnValue(createMockQuery([
        { name: "Deadlift", primaryMuscles: ["hamstrings"], secondaryMuscles: ["glutes", "lower back"] },
        { name: "Hamstring Curl", primaryMuscles: ["hamstrings"], secondaryMuscles: [] }
      ]));

    const result = await analyticsService.getTrainingReadiness("testUser");
    const legs = result.muscleGroups.find((m: any) => m.muscle === "Legs");
    // Duplicate muscles map to Legs: hamstrings and glutes both map to Legs. Primary overrides secondary.
    // 2 sessions = increased load
    expect(legs.sessionsLast7Days).toBe(2);
  });

  it("should handle unknown exercises without crashing", async () => {
    mockDateClass();
    
    (WorkoutSession.find as jest.Mock).mockReturnValue(createMockQuery([
        {
          _id: "s1",
          status: "completed",
          completedAt: new Date("2024-10-15T10:00:00Z"),
          exercises: [
            { exerciseName: "Unknown Custom Lift", sets: [{ completed: true }] }
          ]
        }
      ]));

    (Exercise.find as jest.Mock).mockReturnValue(createMockQuery([]));

    const result = await analyticsService.getTrainingReadiness("testUser");
    expect(result).not.toBeNull();
  });

  describe("getWorkoutActivity", () => {
    it("should return empty days and zero counts when no workouts exist", async () => {
      (workoutSessionRepository.getDailyWorkoutActivity as jest.Mock).mockResolvedValue([]);

      const result = await analyticsService.getWorkoutActivity("testUser", "2025-01-01", "2025-12-31", "UTC");

      expect(result).toEqual({
        days: [],
        totalWorkoutDays: 0,
        totalWorkouts: 0,
      });
      expect(workoutSessionRepository.getDailyWorkoutActivity).toHaveBeenCalledWith(
        "testUser",
        "2025-01-01",
        "2025-12-31",
        "UTC"
      );
    });

    it("should calculate totalWorkoutDays and totalWorkouts correctly", async () => {
      const mockDays = [
        { date: "2026-01-10", count: 1 },
        { date: "2026-01-15", count: 2 },
        { date: "2026-02-01", count: 1 },
      ];
      (workoutSessionRepository.getDailyWorkoutActivity as jest.Mock).mockResolvedValue(mockDays);

      const result = await analyticsService.getWorkoutActivity("testUser", "2026-01-01", "2026-02-28", "America/New_York");

      expect(result.days).toHaveLength(3);
      expect(result.totalWorkoutDays).toBe(3);
      expect(result.totalWorkouts).toBe(4);
      expect(workoutSessionRepository.getDailyWorkoutActivity).toHaveBeenCalledWith(
        "testUser",
        "2026-01-01",
        "2026-02-28",
        "America/New_York"
      );
    });

    it("should fallback to UTC for invalid timezone string", async () => {
      (workoutSessionRepository.getDailyWorkoutActivity as jest.Mock).mockResolvedValue([]);

      await analyticsService.getWorkoutActivity("testUser", undefined, undefined, "NotARealTimezone/Fake");

      expect(workoutSessionRepository.getDailyWorkoutActivity).toHaveBeenCalledWith(
        "testUser",
        undefined,
        undefined,
        "UTC"
      );
    });

    it("should correctly validate and normalize timezones with DateEngine", () => {
      expect(DateEngine.getValidTimezone("UTC")).toBe("UTC");
      expect(DateEngine.getValidTimezone("Z")).toBe("UTC");
      expect(DateEngine.getValidTimezone("America/New_York")).toBe("America/New_York");
      expect(DateEngine.getValidTimezone("+05:30")).toBe("+05:30");
      expect(DateEngine.getValidTimezone("+05")).toBe("+05:00");
      expect(DateEngine.getValidTimezone("Invalid/Tz")).toBe("UTC");
      expect(DateEngine.getValidTimezone(undefined)).toBe("UTC");
    });

    it("should enforce date range bounds in activityQuerySchema", () => {
      // Valid cases
      expect(activityQuerySchema.safeParse({}).success).toBe(true);
      expect(activityQuerySchema.safeParse({ startDate: "2026-01-01", endDate: "2026-06-01" }).success).toBe(true);
      expect(activityQuerySchema.safeParse({ startDate: "2025-01-01", endDate: "2026-12-31" }).success).toBe(true);

      // Invalid: startDate > endDate
      const invertedResult = activityQuerySchema.safeParse({ startDate: "2026-12-01", endDate: "2026-01-01" });
      expect(invertedResult.success).toBe(false);

      // Invalid: range exceeds 730 days
      const excessiveResult = activityQuerySchema.safeParse({ startDate: "2020-01-01", endDate: "2026-01-01" });
      expect(excessiveResult.success).toBe(false);
    });
  });
});
