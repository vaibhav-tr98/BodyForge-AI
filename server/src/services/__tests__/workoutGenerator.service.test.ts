import { workoutGeneratorService } from "../workoutGenerator.service";
import { userRepository } from "../../repositories/user.repository";
import { AIProvider } from "../aiProvider.service";

jest.mock("../../repositories/user.repository");
jest.mock("../aiProvider.service");

describe("WorkoutGeneratorService", () => {
  const mockUserId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully generate a workout plan", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: mockUserId,
      age: 30,
      gender: "male",
      experience: "intermediate",
      fitnessGoal: "build_muscle",
    });

    (AIProvider.generateWorkoutPlan as jest.Mock).mockResolvedValue({
      name: "AI Chest & Triceps",
      description: "A great routine.",
      exercises: [{ name: "Bench Press", sets: 3, reps: 10 }],
    });

    const result = await workoutGeneratorService.generateWorkout(mockUserId, {
      targetMuscles: "Chest",
      availableTime: 45,
      equipment: "Gym",
    });

    expect(result.name).toBe("AI Chest & Triceps");
    expect(result.exercises.length).toBe(1);
    expect(AIProvider.generateWorkoutPlan).toHaveBeenCalledWith(expect.objectContaining({
      targetMuscles: "Chest",
      userExperience: "intermediate",
    }));
  });

  it("should throw error if user not found", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      workoutGeneratorService.generateWorkout(mockUserId, {
        targetMuscles: "Chest",
        availableTime: 45,
        equipment: "Gym",
      })
    ).rejects.toThrow("User not found");
  });

  it("should throw error if AI generation fails", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: mockUserId,
    });

    (AIProvider.generateWorkoutPlan as jest.Mock).mockRejectedValue(new Error("AI Error"));

    await expect(
      workoutGeneratorService.generateWorkout(mockUserId, {
        targetMuscles: "Chest",
        availableTime: 45,
        equipment: "Gym",
      })
    ).rejects.toThrow("AI workout generation is temporarily unavailable.");
  });
});
