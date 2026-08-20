import mongoose from "mongoose";
import { workoutRecommendationService } from "../workoutRecommendation.service";
import { workoutRepository } from "../../repositories/workout.repository";
import { analyticsService } from "../analytics.service";
import Exercise from "../../models/Exercise";

jest.mock("../../repositories/workout.repository");
jest.mock("../analytics.service");
jest.mock("../../models/Exercise");

describe("WorkoutRecommendationService", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return null if no workouts exist", async () => {
    (workoutRepository.findByUserId as jest.Mock).mockResolvedValue([]);
    
    const result = await workoutRecommendationService.getTodayRecommendation(userId);
    expect(result.recommendation).toBeNull();
    expect(result.reason).toBe("Create a workout to receive a recommendation.");
  });

  it("should recommend the first workout if no training history", async () => {
    const workouts = [
      { _id: new mongoose.Types.ObjectId(), name: "Workout A", exercises: [] },
      { _id: new mongoose.Types.ObjectId(), name: "Workout B", exercises: [] }
    ];
    (workoutRepository.findByUserId as jest.Mock).mockResolvedValue(workouts);
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    
    const result = await workoutRecommendationService.getTodayRecommendation(userId);
    expect(result.recommendation).toBeDefined();
    expect(result.recommendation?.workoutId).toBe(workouts[0]._id.toString());
    expect(result.recommendation?.reason).toContain("begin building your training history");
  });

  it("should recommend the workout targeting better recovered muscles", async () => {
    const workouts = [
      { _id: new mongoose.Types.ObjectId(), name: "Push Day", exercises: [{ name: "Bench Press" }] },
      { _id: new mongoose.Types.ObjectId(), name: "Pull Day", exercises: [{ name: "Pull Up" }] }
    ];
    
    (workoutRepository.findByUserId as jest.Mock).mockResolvedValue(workouts);
    (Exercise.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { name: "Bench Press", primaryMuscles: ["chest"] },
        { name: "Pull Up", primaryMuscles: ["back"] }
      ])
    });

    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      muscleGroups: [
        { muscle: "chest", readinessScore: 20, status: "recent" },
        { muscle: "back", readinessScore: 90, status: "ready" }
      ]
    });

    const result = await workoutRecommendationService.getTodayRecommendation(userId);
    expect(result.recommendation?.workoutName).toBe("Pull Day");
    expect(result.recommendation?.readinessScore).toBe(90);
    expect(result.recommendation?.confidence).toBe("high");
  });

  it("should handle conflicts by penalizing scores", async () => {
    const workouts = [
      { _id: new mongoose.Types.ObjectId(), name: "Push Day", exercises: [{ name: "Bench Press" }] }
    ];
    
    (workoutRepository.findByUserId as jest.Mock).mockResolvedValue(workouts);
    (Exercise.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { name: "Bench Press", primaryMuscles: ["chest"] }
      ])
    });

    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      muscleGroups: [
        { muscle: "chest", readinessScore: 25, status: "recent" } // Conflict!
      ]
    });

    const result = await workoutRecommendationService.getTodayRecommendation(userId);
    expect(result.recommendation?.workoutName).toBe("Push Day");
    expect(result.recommendation?.confidence).toBe("low"); // Because of penalty
  });
});

