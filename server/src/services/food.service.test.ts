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

    const mockRoti = {
      name: "Roti",
      baseQuantity: 100,
      baseUnit: "g",
      calories: 260,
      protein: 7.5,
      carbs: 55,
      fat: 1,
      servings: [{ unit: "piece", quantity: 1, equivalent: 40 }]
    };

    const mockMilk = {
      name: "Cow Milk",
      baseQuantity: 100,
      baseUnit: "ml",
      calories: 61,
      protein: 3.2,
      carbs: 4.8,
      fat: 3.3
    };

    const mockApple = {
      name: "Apple",
      baseQuantity: 100,
      baseUnit: "g",
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2
      // no servings metadata
    };

    it("should calculate macros for Roti: 1 piece (serving metadata)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockRoti);
      const macros = await foodService.calculateMacros("Roti", 1, "piece");
      expect(macros).toEqual({
        calories: 104, // 260 * 40 / 100
        protein: 3, // 7.5 * 40 / 100
        carbs: 22, // 55 * 40 / 100
        fat: 0, // 1 * 40 / 100 = 0.4 -> rounded to 0
      });
    });

    it("should calculate macros for Roti: 2 pieces (serving metadata)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockRoti);
      const macros = await foodService.calculateMacros("Roti", 2, "pieces");
      expect(macros).toEqual({
        calories: 208, // 104 * 2
        protein: 6,
        carbs: 44,
        fat: 1, // 0.8 rounded
      });
    });

    it("should calculate macros for Roti: 100g (base unit)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockRoti);
      const macros = await foodService.calculateMacros("Roti", 100, "g");
      expect(macros).toEqual({
        calories: 260,
        protein: 8, // 7.5 rounded
        carbs: 55,
        fat: 1,
      });
    });

    const mockBread = {
      name: "Bread",
      baseQuantity: 100,
      baseUnit: "g",
      calories: 250,
      protein: 10,
      carbs: 50,
      fat: 2,
      servings: [{ unit: "slice", quantity: 1, equivalent: 30 }]
    };

    it("should calculate macros for Bread: 3 slices (pluralization test)", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockBread);
      const macros = await foodService.calculateMacros("Bread", 3, "slices");
      // 3 slices = 90g. 90/100 = 0.9. calories: 250 * 0.9 = 225.
      expect(macros).toEqual({
        calories: 225,
        protein: 9,
        carbs: 45,
        fat: 2, // 1.8 rounded to 2
      });
    });

    it("should calculate macros for Milk: 250ml", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockMilk);
      const macros = await foodService.calculateMacros("Cow Milk", 250, "ml");
      expect(macros).toEqual({
        calories: 153, // 61 * 2.5 = 152.5 -> 153
        protein: 8, // 3.2 * 2.5 = 8
        carbs: 12, // 4.8 * 2.5 = 12
        fat: 8, // 3.3 * 2.5 = 8.25 -> 8
      });
    });

    it("should calculate macros for food without serving metadata using grams", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockApple);
      const macros = await foodService.calculateMacros("Apple", 150, "g");
      expect(macros).toEqual({
        calories: 78, // 52 * 1.5
        protein: 0, // 0.3 * 1.5 = 0.45 -> 0
        carbs: 21, // 14 * 1.5 = 21
        fat: 0, // 0.2 * 1.5 = 0.3 -> 0
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

    it("should reject invalid unit if not in servings and not matching baseUnit", async () => {
      (foodRepository.getFoodByName as jest.Mock).mockResolvedValue(mockChicken);
      await expect(foodService.calculateMacros("Chicken Breast", 100, "ml")).rejects.toThrow(AppError);
    });
  });
});
