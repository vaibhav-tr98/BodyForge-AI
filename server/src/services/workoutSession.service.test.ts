import mongoose from "mongoose";
import { workoutSessionService } from "./workoutSession.service";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { workoutRepository } from "../repositories/workout.repository";
import { progressionService } from "./progression.service";

jest.mock("../repositories/workoutSession.repository");
jest.mock("../repositories/workout.repository");
jest.mock("./progression.service");

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
});
