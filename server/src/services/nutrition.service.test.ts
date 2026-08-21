import { nutritionService } from "./nutrition.service";
import { nutritionRepository } from "../repositories/nutrition.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/nutrition.repository", () => ({
  nutritionRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

describe("NutritionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = "user123";
  const mockEntryId = "entry123";
  const mockDate = "2026-08-21";

  describe("addEntry", () => {
    it("should create a nutrition entry", async () => {
      const mockData = { foodName: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, quantity: 1, unit: "medium", date: mockDate };
      const mockCreated = { _id: mockEntryId, user: mockUserId, ...mockData };
      
      (nutritionRepository.create as jest.Mock).mockResolvedValue(mockCreated);
      
      const result = await nutritionService.addEntry(mockUserId, mockData);
      
      expect(nutritionRepository.create).toHaveBeenCalledWith({ ...mockData, user: mockUserId });
      expect(result).toEqual(mockCreated);
    });
  });

  describe("getSummary", () => {
    it("should calculate daily summary correctly", async () => {
      const mockEntries = [
        { calories: 200, protein: 10, carbs: 20, fat: 5 },
        { calories: 300, protein: 20, carbs: 30, fat: 10 },
      ];
      
      (nutritionRepository.find as jest.Mock).mockResolvedValue(mockEntries);
      
      const result = await nutritionService.getSummary(mockUserId, mockDate);
      
      expect(nutritionRepository.find).toHaveBeenCalledWith({ user: mockUserId, date: mockDate });
      expect(result.totalCalories).toBe(500);
      expect(result.totalProtein).toBe(30);
      expect(result.totalCarbs).toBe(50);
      expect(result.totalFat).toBe(15);
      expect(result.entryCount).toBe(2);
      expect(result.date).toBe(mockDate);
    });

    it("should handle empty nutrition history", async () => {
      (nutritionRepository.find as jest.Mock).mockResolvedValue([]);
      
      const result = await nutritionService.getSummary(mockUserId, mockDate);
      
      expect(result.totalCalories).toBe(0);
      expect(result.totalProtein).toBe(0);
      expect(result.totalCarbs).toBe(0);
      expect(result.totalFat).toBe(0);
      expect(result.entryCount).toBe(0);
    });
  });

  describe("updateEntry", () => {
    it("should update entry if it belongs to user", async () => {
      const mockEntry = { _id: mockEntryId, user: mockUserId, foodName: "Apple" };
      const updateData = { calories: 100 };
      const mockUpdated = { ...mockEntry, ...updateData };
      
      (nutritionRepository.findById as jest.Mock).mockResolvedValue(mockEntry);
      (nutritionRepository.updateOne as jest.Mock).mockResolvedValue(mockUpdated);
      
      const result = await nutritionService.updateEntry(mockUserId, mockEntryId, updateData);
      
      expect(result).toEqual(mockUpdated);
      expect(nutritionRepository.updateOne).toHaveBeenCalledWith({ _id: mockEntryId }, updateData);
    });

    it("should enforce user isolation on update", async () => {
      const mockEntry = { _id: mockEntryId, user: "otherUser" }; // Different user
      (nutritionRepository.findById as jest.Mock).mockResolvedValue(mockEntry);
      
      await expect(nutritionService.updateEntry(mockUserId, mockEntryId, {})).rejects.toThrow(AppError);
      await expect(nutritionService.updateEntry(mockUserId, mockEntryId, {})).rejects.toThrow("Not authorized");
    });
  });

  describe("deleteEntry", () => {
    it("should delete entry if it belongs to user", async () => {
      const mockEntry = { _id: mockEntryId, user: mockUserId };
      (nutritionRepository.findById as jest.Mock).mockResolvedValue(mockEntry);
      (nutritionRepository.deleteOne as jest.Mock).mockResolvedValue(true);
      
      await nutritionService.deleteEntry(mockUserId, mockEntryId);
      
      expect(nutritionRepository.deleteOne).toHaveBeenCalledWith({ _id: mockEntryId });
    });

    it("should enforce user isolation on delete", async () => {
      const mockEntry = { _id: mockEntryId, user: "otherUser" };
      (nutritionRepository.findById as jest.Mock).mockResolvedValue(mockEntry);
      
      await expect(nutritionService.deleteEntry(mockUserId, mockEntryId)).rejects.toThrow(AppError);
    });
  });
});
