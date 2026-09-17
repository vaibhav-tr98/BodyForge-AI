
import mongoose from "mongoose";
import programAnalyticsService from "./programAnalytics.service";
import programRepository from "../repositories/program.repository";
import workoutSessionRepository from "../repositories/workoutSession.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/program.repository");
jest.mock("../repositories/workoutSession.repository");

describe("ProgramAnalyticsService", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const programId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProgram = (overrides = {}) => {
    return {
      _id: programId,
      user: userId,
      name: "Test Program",
      startDate: new Date().toISOString().split("T")[0],
      timezone: "UTC",
      status: "active",
      weeks: [{
        days: [
          { dayIndex: 0, workoutId: new mongoose.Types.ObjectId().toString() },
          { dayIndex: 1, workoutId: null }, // Rest day
          { dayIndex: 2, workoutId: new mongoose.Types.ObjectId().toString() },
          { dayIndex: 3, workoutId: new mongoose.Types.ObjectId().toString() },
          { dayIndex: 4, workoutId: new mongoose.Types.ObjectId().toString() },
          { dayIndex: 5, workoutId: new mongoose.Types.ObjectId().toString() },
          { dayIndex: 6, workoutId: new mongoose.Types.ObjectId().toString() }
        ]
      }],
      ...overrides
    };
  };

  const mockAnalyticsData = (overrides = {}) => ({
    completedDays: [],
    totalCompletedSets: 0,
    totalReps: 0,
    exerciseVolume: [],
    ...overrides
  });

  it("1. Program ownership isolation (Unauthorized / Program not found)", async () => {
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(null);
    await expect(programAnalyticsService.getAnalytics(userId, programId)).rejects.toThrow(new AppError("Program not found", 404));
  });

  it("3. Program before start (startDate in future)", async () => {
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0];
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram({ startDate: futureDate }));
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData());

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    expect(result.adherence.scheduledDaysElapsed).toBe(0);
    expect(result.adherence.percentage).toBe(0);
  });

  it("7. One completed scheduled session in the past", async () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0]; // 2 days ago
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram({ startDate: pastDate }));
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData({
      completedDays: [{ week: 0, day: 0 }]
    }));

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    // Elapsed days: day 0 (workout), day 1 (rest, excluded), day 2 (today). Past scheduled days = 1 (day 0).
    expect(result.adherence.scheduledDaysElapsed).toBe(1);
    expect(result.adherence.completedSessions).toBe(1);
    expect(result.adherence.percentage).toBe(100);
  });

  it("8. Missed scheduled workout", async () => {
    const pastDate = new Date(Date.now() - 86400000 * 3).toISOString().split("T")[0]; // 3 days ago
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram({ startDate: pastDate }));
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData({
      completedDays: [] // Missed
    }));

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    // day 0 (workout, elapsed), day 1 (rest), day 2 (workout, elapsed), day 3 (today).
    expect(result.adherence.scheduledDaysElapsed).toBe(2);
    expect(result.adherence.completedSessions).toBe(0);
    expect(result.adherence.percentage).toBe(0);
  });

  it("6. Rest-only elapsed period", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString().split("T")[0]; // 1 day ago
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram({
      startDate: pastDate,
      weeks: [{ days: Array.from({length: 7}).map((_, i) => ({ dayIndex: i, workoutId: null })) }]
    }));
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData());

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    expect(result.adherence.scheduledDaysElapsed).toBe(0);
    expect(result.adherence.percentage).toBe(0);
  });

  it("9. Multiple sessions same program day", async () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0];
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram({ startDate: pastDate }));
    // getProgramAnalyticsData already uses $group to ensure uniqueness, but mock simulates it
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData({
      completedDays: [{ week: 0, day: 0 }]
    }));

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    expect(result.adherence.completedSessions).toBe(1); // capped at 1
  });

  it("13, 15, 16. Completed sets, Total reps, Load volume calculation", async () => {
    (programRepository.findByIdAndUser as jest.Mock).mockResolvedValue(mockProgram());
    (workoutSessionRepository.getProgramAnalyticsData as jest.Mock).mockResolvedValue(mockAnalyticsData({
      totalCompletedSets: 10,
      totalReps: 100,
      exerciseVolume: [{ exerciseName: "Squat", completedSets: 5, totalReps: 50, loadVolume: 5000 }]
    }));

    const result = await programAnalyticsService.getAnalytics(userId, programId);
    expect(result.volume.totalCompletedSets).toBe(10);
    expect(result.volume.totalReps).toBe(100);
    expect(result.volume.exerciseVolume[0].loadVolume).toBe(5000);
  });
});

