import { foodService } from "./food.service";
import { foodRepository } from "../repositories/food.repository";
import { AppError } from "../errors/AppError";

jest.mock("../repositories/food.repository", () => ({
  foodRepository: {
    searchFoods: jest.fn(),
    getFoodByName: jest.fn(),
  },
}));

describe("FoodService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockChicken = {
    name: "Chicken Breast",
    aliases: ["chicken"],
    baseQuantity: 100,
    baseUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 4,
  };

  const mockEggs = {
    name: "Eggs",
    aliases: ["egg"],
    baseQuantity: 1,
    baseUnit: "piece",
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
  };

  describe("searchFoods", () => {
    it("should return foods from repository", async () => {
      (foodRepository.searchFoods as jest.Mock).mockResolvedValue([mockChicken]);
      const result = await foodService.searchFoods("chicken");
      expect(result).toEqual([mockChicken]);
      expect(foodRepository.searchFoods).toHaveBeenCalledWith("chicken");
    });
  });

  describe("calculateMacros", () => {
    it("should calculate macros for 100g chicken breast", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockChicken);
      const macros = await foodService.calculateMacros("Chicken Breast", 100, "g");
      expect(macros).toEqual({
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 4,
      });
    });

    it("should calculate macros for 200g chicken breast (exactly 2x)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockChicken);
      const macros = await foodService.calculateMacros("Chicken Breast", 200, "g");
      expect(macros).toEqual({
        calories: 330,
        protein: 62,
        carbs: 0,
        fat: 8,
      });
    });

    it("should calculate macros for 3 eggs (piece-based)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockEggs);
      const macros = await foodService.calculateMacros("Eggs", 3, "pieces");
      expect(macros).toEqual({
        calories: 216,
        protein: 19, // 18.9 rounded
        carbs: 1, // 1.2 rounded
        fat: 14, // 14.4 rounded
      });
    });

    it("should reject invalid/unknown food", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(null);
      await expect(foodService.calculateMacros("Unknown Alien Meat", 100, "g")).rejects.toThrow(AppError);
    });

    it("should reject quantity <= 0", async () => {
      await expect(foodService.calculateMacros("Chicken Breast", 0, "g")).rejects.toThrow(AppError);
      await expect(foodService.calculateMacros("Chicken Breast", -50, "g")).rejects.toThrow(AppError);
    });

    it("should reject invalid unit", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockChicken);
      await expect(foodService.calculateMacros("Chicken Breast", 100, "ml")).rejects.toThrow(AppError);
    });
  });
});
