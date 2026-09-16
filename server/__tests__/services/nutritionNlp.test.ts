import { nutritionService } from "../../src/services/nutrition.service";
import { foodService } from "../../src/services/food.service";

jest.mock("../../src/services/aiProvider.service", () => ({
  AIProvider: {
    extractFoodFromText: jest.fn()
  }
}));

jest.mock("../../src/services/food.service", () => ({
  foodService: {
    searchFoods: jest.fn(),
    calculateMacros: jest.fn()
  }
}));

describe("Nutrition NLP Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should extract, match, and calculate previews correctly", async () => {
    const { AIProvider } = require("../../src/services/aiProvider.service");
    
    // Mock extraction
    AIProvider.extractFoodFromText.mockResolvedValue({
      items: [
        { foodText: "eggs", quantity: 2, unit: "piece" }
      ]
    });

    // Mock DB search
    (foodService.searchFoods as jest.Mock).mockResolvedValue([
      { _id: "mongo1", name: "Egg, raw" },
      { _id: "mongo2", name: "Egg, boiled" }
    ]);

    // Mock macro calculation
    (foodService.calculateMacros as jest.Mock).mockResolvedValue({
      calories: 140, protein: 12, carbs: 1, fat: 10
    });

    const result = await nutritionService.analyzeLog("I had 2 eggs");

    expect(AIProvider.extractFoodFromText).toHaveBeenCalledWith("I had 2 eggs");
    expect(foodService.searchFoods).toHaveBeenCalledWith("egg"); // Plural normalized
    expect(foodService.calculateMacros).toHaveBeenCalledTimes(2);

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].status).toBe("ambiguous");
    expect(result.proposals[0].candidates).toHaveLength(2);
    expect(result.proposals[0].candidates[0].preview.calories).toBe(140);
  });

  it("should handle zero candidates safely", async () => {
    const { AIProvider } = require("../../src/services/aiProvider.service");
    
    AIProvider.extractFoodFromText.mockResolvedValue({
      items: [
        { foodText: "unknownfood", quantity: 1, unit: "serving" }
      ]
    });

    (foodService.searchFoods as jest.Mock).mockResolvedValue([]);

    const result = await nutritionService.analyzeLog("I ate unknownfood");

    expect(result.proposals[0].status).toBe("not_found");
    expect(result.proposals[0].candidates.length).toBe(0);
  });
});
