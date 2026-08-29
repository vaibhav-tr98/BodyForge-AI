import { WorkoutGeneratorRequest, GeneratedWorkoutDTO } from "../types/workoutGenerator.types";
import { AIProvider } from "./aiProvider.service";
import { userRepository } from "../repositories/user.repository";

export class WorkoutGeneratorService {
  public async generateWorkout(userId: string, request: WorkoutGeneratorRequest): Promise<GeneratedWorkoutDTO> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    try {
      return await AIProvider.generateWorkoutPlan({
        targetMuscles: request.targetMuscles,
        availableTime: request.availableTime,
        equipment: request.equipment,
        userAge: user.age,
        userGender: user.gender,
        userExperience: user.experience,
        userFitnessGoal: user.fitnessGoal,
      });
    } catch (error) {
      console.error("AI Workout Generation failed:", error);
      throw new Error("AI workout generation is temporarily unavailable.");
    }
  }
}

export const workoutGeneratorService = new WorkoutGeneratorService();
