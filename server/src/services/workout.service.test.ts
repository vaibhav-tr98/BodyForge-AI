import { workoutService } from "./workout.service";
import { workoutRepository } from "../repositories/workout.repository";
import { programRepository } from "../repositories/program.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/workout.repository");
jest.mock("../repositories/program.repository");

describe("WorkoutService", () => {
  const userId = "user1";
  const workoutId = "workout1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteWorkout", () => {
    it("should delete workout if not referenced by any program", async () => {
      (programRepository.isWorkoutReferenced as jest.Mock).mockResolvedValue(false);
      (workoutRepository.deleteByIdAndUser as jest.Mock).mockResolvedValue(true);

      await expect(workoutService.deleteWorkout(workoutId, userId)).resolves.not.toThrow();
      expect(programRepository.isWorkoutReferenced).toHaveBeenCalledWith(workoutId, userId);
      expect(workoutRepository.deleteByIdAndUser).toHaveBeenCalledWith(workoutId, userId);
    });

    it("should reject deletion if referenced by a draft program", async () => {
      (programRepository.isWorkoutReferenced as jest.Mock).mockResolvedValue(true);

      await expect(workoutService.deleteWorkout(workoutId, userId)).rejects.toThrow("Cannot delete workout because it is referenced in a training program");
      expect(workoutRepository.deleteByIdAndUser).not.toHaveBeenCalled();
    });

    it("should reject deletion if referenced by an active program", async () => {
      (programRepository.isWorkoutReferenced as jest.Mock).mockResolvedValue(true);

      await expect(workoutService.deleteWorkout(workoutId, userId)).rejects.toThrow(AppError);
    });

    it("should reject deletion if referenced by a completed program", async () => {
      (programRepository.isWorkoutReferenced as jest.Mock).mockResolvedValue(true);

      await expect(workoutService.deleteWorkout(workoutId, userId)).rejects.toThrow(AppError);
    });
    
    it("should reject deletion if referenced by an archived program", async () => {
      (programRepository.isWorkoutReferenced as jest.Mock).mockResolvedValue(true);

      await expect(workoutService.deleteWorkout(workoutId, userId)).rejects.toThrow(AppError);
    });
  });
});
