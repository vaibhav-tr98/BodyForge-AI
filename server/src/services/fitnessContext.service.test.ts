import { fitnessContextService } from "./fitnessContext.service";
import { userRepository } from "../repositories/user.repository";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { programRepository } from "../repositories/program.repository";
import { analyticsService } from "./analytics.service";
import { nutritionService } from "./nutrition.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import mongoose from "mongoose";

jest.mock("../repositories/user.repository");
jest.mock("../repositories/workoutSession.repository");
jest.mock("../repositories/program.repository");
jest.mock("./analytics.service");
jest.mock("./nutrition.service");
jest.mock("./nutritionTarget.service");

describe("FitnessContextService Unit Tests (M3.2)", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should assemble a complete fitness context when all data is present", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      age: 29,
      gender: "male",
      height: 182,
      weight: 84.5,
      fitnessGoal: "build_muscle",
      experience: "intermediate",
      activityLevel: "moderately_active",
      timezone: "America/New_York",
    });

    (programRepository.findActiveProgram as jest.Mock).mockResolvedValue({
      name: "Upper / Lower Strength & Hypertrophy",
      status: "active",
      startDate: "2026-11-01",
    });

    (workoutSessionRepository.findRecentCompletedDetailed as jest.Mock).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        workout: { name: "Upper Power" },
        completedAt: new Date("2026-11-05T18:30:00Z"),
        exercises: [
          {
            exerciseName: "Barbell Bench Press",
            sets: [
              { weight: 80, reps: 10, completed: true },
              { weight: 90, reps: 8, completed: true },
              { weight: 95, reps: 5, completed: true },
            ],
          },
          {
            exerciseName: "Barbell Row",
            sets: [
              { weight: 70, reps: 10, completed: true },
              { weight: 80, reps: 8, completed: true },
            ],
          },
        ],
      },
    ]);

    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({
      personalRecords: [
        {
          exerciseName: "Barbell Bench Press",
          heaviestWeight: 100,
          bestReps: 12,
          bestSessionVolume: 3200,
          weightImprovementPercent: 15.0,
          lastPerformedAt: new Date("2026-11-05T18:30:00Z"),
        },
      ],
    });

    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue({
      overallScore: 85,
      status: "ready",
      muscleGroups: [
        { muscle: "chest", status: "ready" },
        { muscle: "back", status: "ready" },
        { muscle: "legs", status: "recent" },
      ],
    });

    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({
      calories: 2800,
      protein: 170,
      calculationMethod: "Mifflin-St Jeor + Moderately Active",
    });

    (nutritionService.getHistory as jest.Mock).mockResolvedValue({
      days: [
        {
          date: "2026-11-06",
          calories: 2750,
          protein: 175,
          carbs: 310,
          fat: 70,
          entryCount: 4,
        },
      ],
    });

    const context = await fitnessContextService.assembleFitnessContext(userId);

    // Profile verification
    expect(context.profile.age).toBe(29);
    expect(context.profile.gender).toBe("male");
    expect(context.profile.heightCm).toBe(182);
    expect(context.profile.weightKg).toBe(84.5);
    expect(context.profile.fitnessGoal).toBe("build_muscle");
    expect(context.profile.timezone).toBe("America/New_York");

    // Training verification
    expect(context.training.activeProgram?.name).toBe("Upper / Lower Strength & Hypertrophy");
    expect(context.training.recentWorkouts).toHaveLength(1);
    expect(context.training.recentWorkouts[0].name).toBe("Upper Power");
    expect(context.training.recentWorkouts[0].exercises[0].exerciseName).toBe("Barbell Bench Press");
    expect(context.training.recentWorkouts[0].exercises[0].topSet).toEqual({ weight: 95, reps: 5 });

    // PRs & Readiness
    expect(context.training.topPersonalRecords).toHaveLength(1);
    expect(context.training.topPersonalRecords[0].heaviestWeight).toBe(100);
    expect(context.training.readiness?.overallScore).toBe(85);
    expect(context.training.readiness?.freshMuscles).toContain("chest");
    expect(context.training.readiness?.fatiguedMuscles).toContain("legs");

    // Nutrition verification
    expect(context.nutrition.targets?.calories).toBe(2800);
    expect(context.nutrition.recentSummaries).toHaveLength(1);
    expect(context.nutrition.recentSummaries[0].status).toBe("on_track");

    // Formatted prompt verification
    const formatted = fitnessContextService.formatContextForPrompt(context);
    expect(formatted).toContain("### ATHLETE PROFILE");
    expect(formatted).toContain("Goal: build_muscle");
    expect(formatted).toContain("Barbell Bench Press");
    expect(formatted).toContain("Top set: 95 kg x 5 reps");
    expect(formatted).toContain("Readiness Score: 85/100");
    expect(formatted).toContain("Daily Calorie Target: 2800 kcal");
  });

  it("should safely handle missing profile data without fabricating values", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      // age, height, weight, gender, goal are missing
    });
    (programRepository.findActiveProgram as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.findRecentCompletedDetailed as jest.Mock).mockResolvedValue([]);
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ personalRecords: [] });
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue(null);
    (nutritionService.getHistory as jest.Mock).mockResolvedValue({ days: [] });

    const context = await fitnessContextService.assembleFitnessContext(userId);

    expect(context.profile.age).toBeNull();
    expect(context.profile.heightCm).toBeNull();
    expect(context.profile.weightKg).toBeNull();
    expect(context.profile.fitnessGoal).toBeNull();
    expect(context.training.activeProgram).toBeNull();
    expect(context.training.recentWorkouts).toHaveLength(0);
    expect(context.training.topPersonalRecords).toHaveLength(0);
    expect(context.training.readiness).toBeNull();
    expect(context.nutrition.targets).toBeNull();

    const formatted = fitnessContextService.formatContextForPrompt(context);
    expect(formatted).toContain("Age: Not provided");
    expect(formatted).toContain("Height: Not provided");
    expect(formatted).toContain("Weight: Not provided");
    expect(formatted).toContain("No active training program currently assigned.");
    expect(formatted).toContain("No completed workouts recorded in the last 7 days.");
    expect(formatted).toContain("No personal records recorded yet.");
    expect(formatted).toContain("Daily Nutrition Targets: Not set");
  });

  it("should respect user timezone when formatting workout dates", async () => {
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      timezone: "Asia/Tokyo", // UTC+9
    });
    (programRepository.findActiveProgram as jest.Mock).mockResolvedValue(null);
    (workoutSessionRepository.findRecentCompletedDetailed as jest.Mock).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        workout: { name: "Evening Workout" },
        // 2026-11-05 20:00:00 UTC is 2026-11-06 05:00:00 in Tokyo
        completedAt: new Date("2026-11-05T20:00:00Z"),
        exercises: [],
      },
    ]);
    (analyticsService.getPersonalRecordsAndInsights as jest.Mock).mockResolvedValue({ personalRecords: [] });
    (analyticsService.getTrainingReadiness as jest.Mock).mockResolvedValue(null);
    (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue(null);
    (nutritionService.getHistory as jest.Mock).mockResolvedValue({ days: [] });

    const context = await fitnessContextService.assembleFitnessContext(userId);

    expect(context.profile.timezone).toBe("Asia/Tokyo");
    expect(context.training.recentWorkouts[0].date).toBe("2026-11-06");
  });
});
