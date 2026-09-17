import mongoose from "mongoose";
import { workoutSessionService } from "./workoutSession.service";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { workoutRepository } from "../repositories/workout.repository";
import { progressionService } from "./progression.service";
import { analyticsService } from "./analytics.service";
import { programService } from "./program.service";

jest.mock("./progression.service");
jest.mock("../repositories/workout.repository");
jest.mock("../repositories/workoutSession.repository");
jest.mock("./analytics.service");
jest.mock("./program.service");

const mockSessionRepo = workoutSessionRepository as jest.Mocked<typeof workoutSessionRepository>;
const mockWorkoutRepo = workoutRepository as jest.Mocked<typeof workoutRepository>;
const mockProgressionService = progressionService as jest.Mocked<typeof progressionService>;

describe("WorkoutSessionService - Adaptive Session Loading", () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const workoutId = new mongoose.Types.ObjectId().toHexString();

  const mockWorkout = {
    _id: workoutId,
    name: "Full Body",
    exercises: [
      {
        name: "Squat",
        sets: 3,
        reps: 10,
        weight: 60,
      },
      {
        name: "Push Up",
        sets: 3,
        reps: 15,
        weight: 0,
      }
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionRepo.findActiveSession.mockResolvedValue(null);
    mockWorkoutRepo.findByIdAndUser.mockResolvedValue(mockWorkout as any);
    mockSessionRepo.createSession.mockImplementation(async (uid, sessionData) => {
      return {
        _id: new mongoose.Types.ObjectId(),
        ...sessionData,
        workout: mockWorkout,
      } as any;
    });
  });

  it("1. First-ever workout (no history) - template prescription is preserved", async () => {
    mockProgressionService.getRecommendation.mockResolvedValue({
      recommendation: null,
    } as any);

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(60);
    expect(result.exercises[0].plannedReps).toBe(10);
    expect(result.exercises[1].plannedWeight).toBe(0);
    expect(result.exercises[1].plannedReps).toBe(15);
  });

  it("2/3/4. Valid progression recommendation - new session receives recommended weight/reps", async () => {
    mockProgressionService.getRecommendation.mockImplementation(async (uid, exName) => {
      if (exName === "Squat") {
        return {
          recommendation: { weight: 62.5, sets: 3, minReps: 8, maxReps: 12 },
        } as any;
      }
      return { recommendation: null } as any;
    });

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(62.5);
    expect(result.exercises[0].plannedReps).toBe(12); // maxReps is mapped to plannedReps
    
    // Unchanged fallback
    expect(result.exercises[1].plannedWeight).toBe(0);
    expect(result.exercises[1].plannedReps).toBe(15);
  });

  it("5. Progression recommends maintaining", async () => {
    mockProgressionService.getRecommendation.mockImplementation(async (uid, exName) => {
      if (exName === "Squat") {
        return {
          recommendation: { weight: 60, sets: 3, minReps: 8, maxReps: 12 },
        } as any;
      }
      return { recommendation: null } as any;
    });

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(60);
    expect(result.exercises[0].plannedReps).toBe(12);
  });

  it("6. Progression recommends reducing", async () => {
    mockProgressionService.getRecommendation.mockImplementation(async (uid, exName) => {
      if (exName === "Squat") {
        return {
          recommendation: { weight: 50, sets: 3, minReps: 8, maxReps: 12 },
        } as any;
      }
      return { recommendation: null } as any;
    });

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(50);
  });

  it("7. Template immutability - starting session does not modify Workout template", async () => {
    mockProgressionService.getRecommendation.mockResolvedValue({
      recommendation: { weight: 100, sets: 3, minReps: 5, maxReps: 5 },
    } as any);

    await workoutSessionService.startSession(userId, workoutId);

    // The original mockWorkout object should NOT be mutated
    expect(mockWorkout.exercises[0].weight).toBe(60);
    expect(mockWorkout.exercises[0].reps).toBe(10);
  });

  it("10. Missing historical exercise (recommendation null) - template prescription remains unchanged", async () => {
    mockProgressionService.getRecommendation.mockResolvedValue({
      recommendation: null,
    } as any);

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(60);
    expect(result.exercises[1].plannedWeight).toBe(0);
  });

  it("11/16. Error handling - unexpected progression failure propagates and does NOT swallow the error", async () => {
    mockProgressionService.getRecommendation.mockRejectedValue(new Error("Database offline"));

    await expect(workoutSessionService.startSession(userId, workoutId)).rejects.toThrow("Database offline");
  });

  it("14. Decimal weights - values remain correct", async () => {
    mockProgressionService.getRecommendation.mockResolvedValue({
      recommendation: { weight: 67.5, sets: 3, minReps: 8, maxReps: 10 },
    } as any);

    const result = await workoutSessionService.startSession(userId, workoutId);

    expect(result.exercises[0].plannedWeight).toBe(67.5);
  });

  describe("Phase 4: Progression Insight Snapshot Tests", () => {
    it("1. Recommendation produces progressionInsight", async () => {
      mockProgressionService.getRecommendation.mockResolvedValue({
        reason: "Target increased.",
        latestPerformance: { weight: 60, totalReps: 24, setsCompleted: 3 },
        recommendation: { weight: 62.5, sets: 3, minReps: 8, maxReps: 12 },
      } as any);

      const result = await workoutSessionService.startSession(userId, workoutId);
      expect(result.exercises[0].progressionInsight).toBeDefined();
    });

    it("2. progressionInsight.reason matches ProgressionService response", async () => {
      const reason = "You reached the top of your rep range last session, so your target increased.";
      mockProgressionService.getRecommendation.mockResolvedValue({
        reason,
        latestPerformance: { weight: 60, totalReps: 24, setsCompleted: 3 },
        recommendation: { weight: 62.5, sets: 3, minReps: 8, maxReps: 12 },
      } as any);

      const result = await workoutSessionService.startSession(userId, workoutId);
      expect(result.exercises[0].progressionInsight?.reason).toBe(reason);
    });

    it("3 & 4. previousWeight and previousReps are stored correctly", async () => {
      mockProgressionService.getRecommendation.mockResolvedValue({
        reason: "Maintain weight.",
        latestPerformance: { weight: 60, totalReps: 20, setsCompleted: 3 },
        recommendation: { weight: 60, sets: 3, minReps: 8, maxReps: 12 },
      } as any);

      const result = await workoutSessionService.startSession(userId, workoutId);
      expect(result.exercises[0].progressionInsight?.previousWeight).toBe(60);
      expect(result.exercises[0].progressionInsight?.previousReps).toBe(20);
    });

    it("5 & 6. No-history (recommendation === null) does not fabricate previous values", async () => {
      mockProgressionService.getRecommendation.mockResolvedValue({
        reason: "No previous performance data for this exercise yet.",
        latestPerformance: null,
        recommendation: null,
      } as any);

      const result = await workoutSessionService.startSession(userId, workoutId);
      // progressionInsight should be undefined if recommendation is null
      expect(result.exercises[0].progressionInsight).toBeUndefined();
    });

    it("9 & 10. getSessionById and getActiveSession return progressionInsight", async () => {
      const insight = { reason: "Insightful reason", previousWeight: 100, previousReps: 15 };
      mockSessionRepo.findByIdAndUser.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        workout: mockWorkout,
        exercises: [{ exerciseName: "Squat", plannedSets: 3, plannedReps: 10, progressionInsight: insight, sets: [] }]
      } as any);
      
      const sessionById = await workoutSessionService.getSessionById("fake-id", userId);
      expect(sessionById.exercises[0].progressionInsight).toEqual(insight);

      mockSessionRepo.findActiveSession.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        workout: mockWorkout,
        exercises: [{ exerciseName: "Squat", plannedSets: 3, plannedReps: 10, progressionInsight: insight, sets: [] }]
      } as any);
      const activeSession = await workoutSessionService.getActiveSession(userId);
      expect(activeSession?.exercises[0].progressionInsight).toEqual(insight);
    });

    it("12. Multiple exercises receive independent insight data", async () => {
      mockProgressionService.getRecommendation.mockImplementation(async (uid, exName) => {
        if (exName === "Squat") {
          return {
            reason: "Squat Reason",
            latestPerformance: { weight: 100, totalReps: 20 },
            recommendation: { weight: 105, sets: 3, minReps: 8, maxReps: 10 },
          } as any;
        } else if (exName === "Push Up") {
          return {
            reason: "Push Up Reason",
            latestPerformance: { weight: 0, totalReps: 45 },
            recommendation: { weight: 0, sets: 3, minReps: 15, maxReps: 20 },
          } as any;
        }
        return { recommendation: null } as any;
      });

      const result = await workoutSessionService.startSession(userId, workoutId);
      expect(result.exercises[0].progressionInsight?.reason).toBe("Squat Reason");
      expect(result.exercises[0].progressionInsight?.previousWeight).toBe(100);
      
      expect(result.exercises[1].progressionInsight?.reason).toBe("Push Up Reason");
      expect(result.exercises[1].progressionInsight?.previousWeight).toBe(0);
    });
  });

  describe("Phase 8.1: Scheduled Sessions", () => {
    it("should start a scheduled session and attach program data", async () => {
      mockProgressionService.getRecommendation.mockResolvedValue({
        recommendation: null,
      } as any);

      const mockProgramService = programService as jest.Mocked<typeof programService>;
      const programId = new mongoose.Types.ObjectId().toHexString();
      mockProgramService.getTodaySchedule.mockResolvedValue({
        hasActiveProgram: true,
        programId: programId,
        currentWeek: 1,
        currentDay: 2,
        isRestDay: false,
        workout: { _id: workoutId, name: "Legs" },
      });

      const result = await workoutSessionService.startSession(userId, workoutId, {
        programId,
        programWeek: 1,
        programDay: 2
      });

      expect(mockSessionRepo.createSession).toHaveBeenCalledWith(userId, expect.objectContaining({
        programId,
        programWeek: 1,
        programDay: 2
      }));
    });

    it("should reject a scheduled session if program does not match", async () => {
      const mockProgramService = programService as jest.Mocked<typeof programService>;
      const programId = new mongoose.Types.ObjectId().toHexString();
      mockProgramService.getTodaySchedule.mockResolvedValue({
        hasActiveProgram: true,
        programId: programId,
        currentWeek: 1,
        currentDay: 3, // mismatched
        isRestDay: false,
        workout: { _id: workoutId, name: "Legs" },
      });

      await expect(workoutSessionService.startSession(userId, workoutId, {
        programId,
        programWeek: 1,
        programDay: 2
      })).rejects.toThrow("Requested schedule does not match today's schedule");
    });
  });
});
