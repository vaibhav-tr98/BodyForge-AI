import mongoose from "mongoose";
import { progressionService } from "./progression.service";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";

// Mock the repository
jest.mock("../repositories/workoutSession.repository");

const mockWorkoutSessionRepository = workoutSessionRepository as jest.Mocked<typeof workoutSessionRepository>;

describe("ProgressionService", () => {
  const userId = new mongoose.Types.ObjectId().toHexString();
  const exerciseName = "Bench Press";
  const plannedSets = 3;
  const plannedReps = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockSession = (weight: number, setsCompleted: number, repsPerSet: number) => {
    const sets = [];
    for (let i = 0; i < setsCompleted; i++) {
      sets.push({
        setNumber: i + 1,
        weight,
        reps: repsPerSet,
        completed: true,
      });
    }

    return {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(userId),
      workout: new mongoose.Types.ObjectId(),
      startedAt: new Date(),
      status: "completed",
      exercises: [
        {
          exerciseName,
          plannedSets,
          plannedReps,
          sets,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  };

  it("returns no recommendation when there is no history", async () => {
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    expect(result.recommendation).toBeNull();
    expect(result.reason).toBe("No previous performance data for this exercise yet.");
    expect(result.confidence).toBe("low");
  });

  it("recommends maintaining weight on first session", async () => {
    const session1 = createMockSession(50, 3, 10);
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    expect(result.recommendation?.weight).toBe(50);
    expect(result.recommendation?.sets).toBe(3);
    expect(result.recommendation?.minReps).toBe(8);
    expect(result.recommendation?.maxReps).toBe(12);
    expect(result.reason).toContain("first recorded session");
  });

  it("recommends maintaining weight when user does not hit top of rep range", async () => {
    // Latest session: 50kg for 3x10 (top of range is 12)
    const session1 = createMockSession(50, 3, 10);
    // Previous session: 50kg for 3x9
    const session2 = createMockSession(50, 3, 9);
    
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1, session2]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    expect(result.recommendation?.weight).toBe(50);
    expect(result.reason).toContain("Maintain 50 kg");
  });

  it("recommends increasing weight when user consistently hits top of rep range", async () => {
    // Latest session: 50kg for 3x12 (top of range is 12)
    const session1 = createMockSession(50, 3, 12);
    const session2 = createMockSession(50, 3, 12);
    
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1, session2]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    // 50 * 0.025 = 1.25. Math.round(51.25 * 2) / 2 = 51.5
    expect(result.recommendation?.weight).toBe(51.5);
    expect(result.reason).toContain("Increase the load");
  });

  it("recommends maintaining weight if performance drops", async () => {
    // Latest session: 50kg for 3x8 (total reps = 24)
    const session1 = createMockSession(50, 3, 8);
    // Previous session: 50kg for 3x12 (total reps = 36) -> 24 < 36 * 0.85
    const session2 = createMockSession(50, 3, 12);
    
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1, session2]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    expect(result.recommendation?.weight).toBe(50);
    expect(result.reason).toContain("performance dropped");
  });

  it("progresses reps instead of weight for bodyweight exercises", async () => {
    const bwExerciseName = "Pull-ups";
    // Latest session: 0kg for 3x12 (top of range is 12)
    const session1 = createMockSession(0, 3, 12);
    session1.exercises[0].exerciseName = bwExerciseName;
    const session2 = createMockSession(0, 3, 12);
    session2.exercises[0].exerciseName = bwExerciseName;

    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1, session2]);

    const result = await progressionService.getRecommendation(userId, bwExerciseName, plannedSets, plannedReps);

    expect(result.recommendation?.weight).toBe(0);
    expect(result.recommendation?.minReps).toBe(10); // progressed by 2
    expect(result.recommendation?.maxReps).toBe(14); // progressed by 2
    expect(result.reason).toContain("Increase the rep target");
  });

  it("ignores incomplete sessions / sets", async () => {
    // Not explicitly testing repository here, but testing that if sets are incomplete, it acts accordingly
    const session1 = createMockSession(50, 3, 12);
    session1.exercises[0].sets[2].completed = false; // Last set incomplete
    // Now it only completed 2x12 = 24 reps
    
    mockWorkoutSessionRepository.findCompletedSessionsByExercise.mockResolvedValue([session1]);

    const result = await progressionService.getRecommendation(userId, exerciseName, plannedSets, plannedReps);

    expect(result.latestPerformance?.setsCompleted).toBe(2);
    expect(result.latestPerformance?.totalReps).toBe(24);
  });
});
