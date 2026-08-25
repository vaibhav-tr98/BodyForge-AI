import { progressService } from "./progress.service";
import { progressRepository } from "../repositories/progress.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/progress.repository", () => ({
  progressRepository: {
    create: jest.fn(),
    findByIdForUser: jest.fn(),
    findByUser: jest.fn(),
    findByUserAndDate: jest.fn(),
    updateForUser: jest.fn(),
    deleteForUser: jest.fn(),
    getLatestForUser: jest.fn(),
  },
}));

describe("ProgressService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = "user123";
  const mockEntryId = "entry123";
  const mockDate = "2026-08-25";

  describe("createProgressEntry", () => {
    it("should create a progress entry if none exists for the date", async () => {
      const mockData = { date: mockDate, weight: 75.5 };
      const mockCreated = { _id: mockEntryId, user: mockUserId, ...mockData };
      
      (progressRepository.findByUserAndDate as jest.Mock).mockResolvedValue(null);
      (progressRepository.create as jest.Mock).mockResolvedValue(mockCreated);
      
      const result = await progressService.createProgressEntry(mockUserId, mockData);
      
      expect(progressRepository.findByUserAndDate).toHaveBeenCalledWith(mockUserId, mockDate);
      expect(progressRepository.create).toHaveBeenCalledWith(expect.objectContaining({ date: mockDate, weight: 75.5, user: mockUserId }));
      expect(result).toEqual(mockCreated);
    });

    it("should throw an error if entry for date already exists", async () => {
      const mockData = { date: mockDate, weight: 75.5 };
      (progressRepository.findByUserAndDate as jest.Mock).mockResolvedValue({ _id: mockEntryId });
      
      await expect(progressService.createProgressEntry(mockUserId, mockData)).rejects.toThrow(AppError);
    });
  });

  describe("getProgressSummary", () => {
    it("should calculate summary correctly for losing trend", async () => {
      const mockHistory = [
        { _id: "3", weight: 73, date: "2026-08-25" }, // latest
        { _id: "2", weight: 74, date: "2026-08-20" },
        { _id: "1", weight: 75, date: "2026-08-15" }, // oldest
      ];
      
      (progressRepository.findByUser as jest.Mock).mockResolvedValue(mockHistory);
      
      const result = await progressService.getProgressSummary(mockUserId);
      
      expect(result.currentWeight).toBe(73);
      expect(result.startingWeight).toBe(75);
      expect(result.weightChange).toBe(-2);
      expect(result.weightChangePercentage).toBeCloseTo(-2.67, 2);
      expect(result.trend).toBe("losing");
      expect(result.totalEntries).toBe(3);
    });

    it("should calculate summary correctly for gaining trend", async () => {
      const mockHistory = [
        { _id: "3", weight: 78, date: "2026-08-25" }, // latest
        { _id: "2", weight: 76, date: "2026-08-20" },
        { _id: "1", weight: 75, date: "2026-08-15" }, // oldest
      ];
      
      (progressRepository.findByUser as jest.Mock).mockResolvedValue(mockHistory);
      
      const result = await progressService.getProgressSummary(mockUserId);
      
      expect(result.trend).toBe("gaining");
      expect(result.weightChange).toBe(3);
    });

    it("should calculate summary correctly for stable trend", async () => {
      const mockHistory = [
        { _id: "3", weight: 75, date: "2026-08-25" }, // latest
        { _id: "2", weight: 75, date: "2026-08-20" },
        { _id: "1", weight: 75, date: "2026-08-15" }, // oldest
      ];
      
      (progressRepository.findByUser as jest.Mock).mockResolvedValue(mockHistory);
      
      const result = await progressService.getProgressSummary(mockUserId);
      
      expect(result.trend).toBe("stable");
      expect(result.weightChange).toBe(0);
    });

    it("should handle empty history", async () => {
      (progressRepository.findByUser as jest.Mock).mockResolvedValue([]);
      
      const result = await progressService.getProgressSummary(mockUserId);
      
      expect(result.currentWeight).toBeNull();
      expect(result.startingWeight).toBeNull();
      expect(result.weightChange).toBeNull();
      expect(result.trend).toBe("no_history");
      expect(result.totalEntries).toBe(0);
    });
  });

  describe("updateProgressEntry", () => {
    it("should update entry if it belongs to user", async () => {
      const mockEntry = { _id: mockEntryId, user: mockUserId, date: mockDate, weight: 75 };
      const updateData = { weight: 74 };
      const mockUpdated = { ...mockEntry, ...updateData };
      
      (progressRepository.findByIdForUser as jest.Mock).mockResolvedValue(mockEntry);
      (progressRepository.updateForUser as jest.Mock).mockResolvedValue(mockUpdated);
      
      const result = await progressService.updateProgressEntry(mockUserId, mockEntryId, updateData);
      
      expect(result).toEqual(mockUpdated);
      expect(progressRepository.updateForUser).toHaveBeenCalledWith(mockUserId, mockEntryId, updateData);
    });

    it("should enforce user isolation on update", async () => {
      (progressRepository.findByIdForUser as jest.Mock).mockResolvedValue(null);
      
      await expect(progressService.updateProgressEntry(mockUserId, mockEntryId, {})).rejects.toThrow(AppError);
    });
  });

  describe("deleteProgressEntry", () => {
    it("should delete entry if it belongs to user", async () => {
      (progressRepository.deleteForUser as jest.Mock).mockResolvedValue(true);
      
      await progressService.deleteProgressEntry(mockUserId, mockEntryId);
      
      expect(progressRepository.deleteForUser).toHaveBeenCalledWith(mockUserId, mockEntryId);
    });

    it("should enforce user isolation on delete", async () => {
      (progressRepository.deleteForUser as jest.Mock).mockResolvedValue(false);
      
      await expect(progressService.deleteProgressEntry(mockUserId, mockEntryId)).rejects.toThrow(AppError);
    });
  });
});
