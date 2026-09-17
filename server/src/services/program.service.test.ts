import mongoose from "mongoose";
import { programService } from "./program.service";
import { programRepository } from "../repositories/program.repository";
import Workout from "../models/Workout";
import WorkoutSession from "../models/WorkoutSession";

jest.mock("../repositories/program.repository");
jest.mock("../models/Workout");
jest.mock("../models/WorkoutSession");

describe("ProgramService", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const workout1Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getValidWeeks = () => [
    {
      days: [
        { dayIndex: 0, workoutId: workout1Id },
      ]
    }
  ];

  describe("createProgram", () => {
    it("should create a program successfully", async () => {
      const data = {
        name: "Test Program",
        startDate: "2026-09-01",
        timezone: "UTC",
        weeks: getValidWeeks()
      };

      (Workout.find as jest.Mock).mockResolvedValue([{ _id: workout1Id }]);
      (programRepository.createProgram as jest.Mock).mockResolvedValue({
        _id: "prog1",
        name: "Test Program",
        status: "draft",
        weeks: data.weeks
      });

      const result = await programService.createProgram(userId, data);
      expect(Workout.find).toHaveBeenCalled();
      expect(result.name).toBe("Test Program");
    });
  });

  describe("updateProgram", () => {
    it("should prevent activating if another program is active and NOT finished", async () => {
      (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue({ _id: "prog2", status: "draft" });
      (programRepository.findActiveProgram as jest.Mock).mockResolvedValue({ 
        _id: "prog1", 
        status: "active",
        startDate: "2026-09-01",
        timezone: "UTC",
        weeks: [{ days: [] }, { days: [] }] // 2 weeks long
      });

      // Mock DateEngine for program 1 to say it is NOT finished
      const dateEngineSpy = jest.spyOn(require("../utils/dateEngine").DateEngine, "getProgramPosition").mockReturnValue({
        week: 1, // Still in week 2
        day: 0
      });

      await expect(programService.updateProgram("prog2", userId, { status: "active" })).rejects.toThrow("You already have an active program");
      
      dateEngineSpy.mockRestore();
    });

    it("should auto-complete an expired active program when activating a new one", async () => {
      (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue({ _id: "prog2", status: "draft" });
      (programRepository.findActiveProgram as jest.Mock).mockResolvedValue({ 
        _id: "prog1", 
        status: "active",
        startDate: "2026-09-01",
        timezone: "UTC",
        weeks: [{ days: [] }, { days: [] }] // 2 weeks long
      });
      (programRepository.updateProgram as jest.Mock).mockResolvedValue({ 
        _id: "prog2", 
        status: "active",
        weeks: [] 
      });

      const dateEngineSpy = jest.spyOn(require("../utils/dateEngine").DateEngine, "getProgramPosition").mockReturnValue({
        week: 2, // Past the 2 weeks length
        day: 0
      });

      await expect(programService.updateProgram("prog2", userId, { status: "active" })).resolves.toBeDefined();
      
      // Should have transitioned prog1 to completed
      expect(programRepository.updateProgram).toHaveBeenCalledWith("prog1", userId, { status: "completed" });
      // Should have then activated prog2
      expect(programRepository.updateProgram).toHaveBeenCalledWith("prog2", userId, { status: "active" });

      dateEngineSpy.mockRestore();
    });
  });

  describe("deleteProgram", () => {
    it("should delete a draft program", async () => {
      (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue({ _id: "prog1", status: "draft" });
      (programRepository.deleteProgram as jest.Mock).mockResolvedValue(true);

      await programService.deleteProgram("prog1", userId);
      expect(programRepository.deleteProgram).toHaveBeenCalledWith("prog1", userId);
    });
  });

  describe("getTodaySchedule", () => {
    it("should return correct schedule", async () => {
      (programRepository.findActiveProgram as jest.Mock).mockResolvedValue({
        _id: "prog1",
        status: "active",
        startDate: "2026-09-01",
        timezone: "UTC",
        weeks: [{ days: [{ dayIndex: 0, workoutId: workout1Id }] }]
      });

      (WorkoutSession.findOne as jest.Mock).mockResolvedValue(null);
      (Workout.findById as jest.Mock).mockResolvedValue({ _id: workout1Id, name: "Push Day" });

      const schedule = await programService.getTodaySchedule(userId, new Date("2026-09-01T10:00:00Z"));
      expect(schedule.hasActiveProgram).toBe(true);
      expect(schedule.isRestDay).toBe(false);
      expect(schedule.workout?._id).toBe(workout1Id);
    });
  });
});

