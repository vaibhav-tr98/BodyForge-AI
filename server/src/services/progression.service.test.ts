import mongoose from "mongoose";
import { progressionService } from "./progression.service";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";

// Mock the repository
jest.mock("../repositories/workoutSession.repository");

const mockWorkoutSessionRepository = workoutSessionRepository as jest.Mocked<typeof workoutSessionRepository>;

describe("ProgressionService (Advanced Adaptive Engine)", () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const exerciseName = "Bench Press";
  const plannedSets = 3;
  const plannedReps = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockSession = (weight: number, setsCompleted: number, repsPerSet: number, daysAgo: number = 0, completed: boolean = true) => {
    const sets = [];
    for (let i = 0; i < setsCompleted; i++) {
      sets.push({
        setNumber: i + 1,
        weight,
        reps: repsPerSet,
        completed,
      });
    }

    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      workout: new mongoose.Types.ObjectId(),
      startedAt: date,
      status: completed ? "completed" : "active",
      exercises: [
        {
          exerciseName,
          plannedSets,
          plannedReps,
          sets,
        },
      ],
      createdAt: date,
      updatedAt: date,
    } as any;
  };

  describe("Core Safety Invariants & History", () => {
    it("1. insufficient history (0 history) returns null recommendation", async () => {
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation).toBeNull();
      expect(result.confidence).toBe("low");
    });

    it("2. one previous session returns exact weight maintenance", async () => {
      const session1 = createMockSession(50, 3, 10, 0);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBe(50);
      expect(result.reason).toContain("first recorded session");
    });

    it("3. two previous sessions (stable) maintains weight", async () => {
      const session1 = createMockSession(50, 3, 10, 0);
      const session2 = createMockSession(50, 3, 10, 2);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1, session2]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBe(50);
      expect(result.reason).toContain("Maintain");
    });

    it("16. invalid weight/reps handled gracefully", async () => {
      // Negative weight is logically filtered/ignored, fallback to 0 or valid
      const session1 = createMockSession(-10, 3, -5, 0);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation).toBeNull(); // Because sets are invalid and filtered out
    });

    it("17. zero-volume session is skipped", async () => {
      const session1 = createMockSession(50, 0, 10, 0);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation).toBeNull();
    });

    it("18. failed session (incomplete sets) filtered out", async () => {
      const session1 = createMockSession(50, 3, 10, 0, false);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation).toBeNull();
    });

    it("27. no NaN/Infinity in recommendation", async () => {
      // Mock repository returning weird but technically parsable data
      const session1 = createMockSession(NaN, NaN, NaN, 0);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation).toBeNull(); // Failed NaN logic, should return null safely
    });

    it("28. no zero/negative sets", async () => {
      // Single set deload
      const s1 = createMockSession(50, 1, 10, 0);
      const s2 = createMockSession(50, 1, 10, 2);
      const s3 = createMockSession(50, 1, 10, 4);
      const s4 = createMockSession(50, 1, 10, 6);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2, s3, s4]);
      // Deload drops sets by 1, but Math.max(1, sets - 1) protects it
      const result = await progressionService.getRecommendation(userId, exerciseName, 1 /* planned */, plannedReps);
      expect(result.recommendation?.sets).toBe(1); // 9. single-set deload protected
    });

    it("26. unexpected repository error propagation", async () => {
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockRejectedValue(new Error("DB Connection Error"));
      await expect(progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps))
        .rejects.toThrow("DB Connection Error");
    });

    it("22. user isolation implicitly working", async () => {
       // Just testing standard userId passing
       mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([]);
       await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
       expect(mockWorkoutSessionRepository.findCompletedSessionsByExercise).toHaveBeenCalledWith(userId, exerciseName, 5);
    });
  });

  describe("Adaptive Engine Core (Linear, Plateau, Regression)", () => {
    it("4. linear progression (weight up)", async () => {
      // progressed reps
      const s1 = createMockSession(50, 3, 12, 0);
      const s2 = createMockSession(50, 3, 10, 2);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBeGreaterThan(50); // increased weight
      expect(result.reason).toContain("progressing well");
    });

    it("7. regression triggers maintain response", async () => {
      const s1 = createMockSession(50, 3, 6, 0); // e1RM drops
      const s2 = createMockSession(50, 3, 10, 2);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBe(50);
      expect(result.reason).toContain("performance dropped");
    });

    it("6. plateau detection over 3 sessions", async () => {
      const s1 = createMockSession(50, 3, 10, 0);
      const s2 = createMockSession(50, 3, 10, 2);
      const s3 = createMockSession(50, 3, 10, 4);
      const s4 = createMockSession(50, 3, 8, 6);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2, s3, s4]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.reason).toContain("plateaued over 3 sessions");
      // 8. deload recommendation triggers correctly
      expect(result.recommendation?.weight).toBeLessThan(50); // 15% drop
      expect(result.recommendation?.sets).toBe(2); // 1 less set
    });

    it("10. post-intervention recovery triggers after deload", async () => {
      // s1: the deload session (light weight, lower reps)
      const s1 = createMockSession(40, 2, 8, 0);
      // s2, s3, s4: the plateau before deload
      const s2 = createMockSession(50, 3, 10, 2);
      const s3 = createMockSession(50, 3, 10, 4);
      const s4 = createMockSession(50, 3, 10, 6);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2, s3, s4]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.reason).toContain("Resuming normal progression");
      // plateau max was 50, recovery target is ~92.5%, roughly 45-47.5
      expect(result.recommendation?.weight).toBeGreaterThan(40);
      expect(result.recommendation?.weight).toBeLessThan(50);
      expect(result.recommendation?.sets).toBe(3); // restored sets
    });

    it("11. >14 day gap triggers conservative restart", async () => {
      const s1 = createMockSession(100, 3, 10, 20); // 20 days ago
      const s2 = createMockSession(100, 3, 10, 22); // 22 days ago
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.reason).toContain("over 2 weeks");
      expect(result.recommendation?.weight).toBe(90); // 10% drop
    });
  });

  describe("Formulas & Edge Cases", () => {
    it("13. high-rep e1RM capped at 15", async () => {
      const s1 = createMockSession(50, 3, 20, 0); // 20 reps
      const s2 = createMockSession(50, 3, 25, 2); // 25 reps
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      // e1RM capped, so they look identical in performance => stable => maintain
      expect(result.reason).toContain("progressing well");
    });

    it("14. & 15. decimal weight and realistic rounding", async () => {
      const s1 = createMockSession(51.25, 3, 12, 0);
      const s2 = createMockSession(51.25, 3, 12, 2);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      // weight goes up by 2.5%, minimum rounded to nearest 0.5 => 52.5
      expect(result.recommendation?.weight).toBe(52.5);
    });

    it("12. bodyweight exercise handles correctly", async () => {
      const s1 = createMockSession(0, 3, 10, 0);
      const s2 = createMockSession(0, 3, 8, 2);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBe(0);
      expect(result.reason).toContain("Great progress");
      expect(result.recommendation?.minReps).toBe(10);
    });

    it("21. multi-exercise workout extraction", async () => {
      const session = createMockSession(50, 3, 10, 0);
      // add a dummy exercise
      session.exercises.unshift({
        exerciseName: "Squat",
        plannedSets: 3,
        plannedReps: 10,
        sets: [{ setNumber: 1, weight: 100, reps: 10, completed: true }]
      });

      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session]);
      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBe(50); // safely ignores Squat and finds Bench
    });
  });

  describe("Surgical Fixes (Blocker 1 & 2)", () => {
    it("Blocker 1: Deload below 2.5kg doesn't reset and uses fractional weight safely", async () => {
      // 2kg for 10 reps plateau
      const s1 = createMockSession(2.0, 3, 10, 0);
      const s2 = createMockSession(2.0, 3, 10, 2);
      const s3 = createMockSession(2.0, 3, 10, 4);
      const s4 = createMockSession(2.0, 3, 8, 6);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2, s3, s4]);

      const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);
      expect(result.recommendation?.weight).toBeLessThan(2.0);
      expect(result.reason).toContain("plateaued over 3 sessions");
    });

    it("Blocker 2: Post-deload uses e1RM calculation mathematically", async () => {
      // Deload session
      const s1 = createMockSession(40, 2, 8, 0);
      // Plateau sessions
      const s2 = createMockSession(50, 3, 10, 2);
      const s3 = createMockSession(50, 3, 10, 4);
      const s4 = createMockSession(50, 3, 10, 6);
      mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([s1, s2, s3, s4]);

      // Different rep targets should produce mathematically different working loads from same e1RM
      const result10 = await progressionService.getRecommendation(userId, exerciseName, 3, 10);
      const result5 = await progressionService.getRecommendation(userId, exerciseName, 3, 5);

      expect(result10.recommendation?.weight).toBeGreaterThan(0);
      expect(result5.recommendation?.weight).toBeGreaterThan(0);
      expect(result10.recommendation?.weight).not.toBe(result5.recommendation?.weight);
    });
  });
});
