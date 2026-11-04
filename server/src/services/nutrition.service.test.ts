import { nutritionService } from "./nutrition.service";
import { nutritionRepository } from "../repositories/nutrition.repository";
import { AppError } from "../errors/AppError";
import { userRepository } from "../repositories/user.repository";
import { workoutRecommendationService } from "./workoutRecommendation.service";
import { foodService } from "./food.service";
import { AIProvider, classifyGeminiError } from "./aiProvider.service";

jest.mock("../repositories/nutrition.repository", () => ({
  nutritionRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock("../repositories/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
  }
}));

jest.mock("./food.service", () => ({
  foodService: {
    calculateMacros: jest.fn(),
    searchFoods: jest.fn(),
    getFoodByName: jest.fn(),
  }
}));

jest.mock("./workoutRecommendation.service", () => ({
  workoutRecommendationService: {
    getTodayRecommendation: jest.fn(),
  }
}));

jest.mock("./nutritionTarget.service", () => ({
  nutritionTargetService: {
    calculateTargets: jest.fn(),
  }
}));

jest.mock("./aiProvider.service", () => ({
  AIProvider: {
    extractFoodFromText: jest.fn(),
  },
  classifyGeminiError: jest.fn(),
}));

describe("NutritionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (foodService.calculateMacros as jest.Mock).mockResolvedValue({
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6
    });
    (classifyGeminiError as jest.Mock).mockReturnValue({
      isQuotaExhausted: false,
      isRateLimit: false,
      isServerError: false,
      isRetryable: false,
      retryAfterMs: null
    });
  });

  const mockUserId = "user123";
  const mockEntryId = "entry123";
  const mockDate = "2026-08-21";

  describe("addEntry", () => {
    it("should create a nutrition entry", async () => {
      const mockData = { foodName: "Chicken Breast", quantity: 100, unit: "g", date: mockDate };
      const mockCreated = { _id: mockEntryId, user: mockUserId, ...mockData };
      
      (nutritionRepository.create as jest.Mock).mockResolvedValue(mockCreated);
      
      const result = await nutritionService.addEntry(mockUserId, mockData);
      
      expect(nutritionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ foodName: "Chicken Breast", user: mockUserId, calories: 165 }));
      expect(result).toEqual(mockCreated);
    });

    it("should reject adding an entry with non-positive or non-finite quantity", async () => {
      await expect(nutritionService.addEntry(mockUserId, { foodName: "Chicken", quantity: 0, unit: "g" })).rejects.toThrow(AppError);
      await expect(nutritionService.addEntry(mockUserId, { foodName: "Chicken", quantity: -10, unit: "g" })).rejects.toThrow(AppError);
      await expect(nutritionService.addEntry(mockUserId, { foodName: "Chicken", quantity: NaN, unit: "g" })).rejects.toThrow(AppError);
      await expect(nutritionService.addEntry(mockUserId, { foodName: "Chicken", quantity: Infinity, unit: "g" })).rejects.toThrow(AppError);
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

  describe("getTodayOverview", () => {
    it("should return target_reached status and workout details if available, with valid targets", async () => {
      const mockEntries = [
        { calories: 2400, protein: 160, carbs: 150, fat: 50 },
      ];
      
      const { nutritionTargetService } = require("./nutritionTarget.service");
      
      (nutritionRepository.find as jest.Mock).mockResolvedValue(mockEntries);
      (userRepository.findById as jest.Mock).mockResolvedValue({ _id: mockUserId });
      (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue({
        calories: 2400,
        protein: 160,
      });
      (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ 
        recommendation: { workoutName: "Push Day" } 
      });
      
      const result = await nutritionService.getTodayOverview(mockUserId, mockDate);
      
      expect(result.targets?.calories).toBe(2400);
      expect(result.targets?.protein).toBe(160);
      
      expect(result.status.calories).toBe("target_reached");
      expect(result.status.protein).toBe("target_reached");
      
      expect(result.workout.hasWorkout).toBe(true);
      expect(result.workout.workoutName).toBe("Push Day");
    });

    it("should return null targets if profile is incomplete", async () => {
      const mockEntries = [
        { calories: 1500, protein: 100, carbs: 150, fat: 50 },
      ];
      
      const { nutritionTargetService } = require("./nutritionTarget.service");
      
      (nutritionRepository.find as jest.Mock).mockResolvedValue(mockEntries);
      (userRepository.findById as jest.Mock).mockResolvedValue({ _id: mockUserId });
      (nutritionTargetService.calculateTargets as jest.Mock).mockReturnValue(null);
      (workoutRecommendationService.getTodayRecommendation as jest.Mock).mockResolvedValue({ recommendation: null });
      
      const result = await nutritionService.getTodayOverview(mockUserId, mockDate);
      
      expect(result.targets).toBeNull();
      expect(result.progress).toBeNull();
      
      expect(result.status.calories).toBe("no_target");
      expect(result.status.protein).toBe("no_target");
      
      expect(result.workout.hasWorkout).toBe(false);
      expect(result.workout.workoutName).toBeUndefined();
    });
  });

  describe("analyzeLog", () => {
    it("should extract foods, match database records, and calculate macros for each proposal", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockResolvedValue({
        items: [
          { foodText: "egg", quantity: 2, unit: "piece" },
          { foodText: "banana", quantity: 1, unit: "piece" }
        ]
      });

      const mockEgg = { _id: "egg1", name: "Egg, whole, raw, fresh", baseQuantity: 100, baseUnit: "g" };
      const mockBanana = { _id: "banana1", name: "Bananas, raw", baseQuantity: 100, baseUnit: "g" };

      (foodService.searchFoods as jest.Mock).mockImplementation(async (query: string) => {
        if (query.includes("egg")) return [mockEgg];
        if (query.includes("banana")) return [mockBanana];
        return [];
      });

      (foodService.calculateMacros as jest.Mock).mockImplementation(async (foodName: string) => {
        if (foodName.includes("Egg")) return { calories: 143, protein: 13, carbs: 1, fat: 10 };
        if (foodName.includes("Banana")) return { calories: 105, protein: 1, carbs: 27, fat: 0 };
        return { calories: 100, protein: 10, carbs: 10, fat: 10 };
      });

      const response = await nutritionService.analyzeLog("I had 2 eggs and 1 banana");

      expect(response.proposals).toHaveLength(2);

      const eggProposal = response.proposals[0];
      expect(eggProposal.extractedFood).toBe("egg");
      expect(eggProposal.quantity).toBe(2);
      expect(eggProposal.unit).toBe("piece");
      expect(eggProposal.status).toBe("matched");
      expect(eggProposal.selectedCandidateId).toBe("egg1");
      expect(eggProposal.candidates[0].preview.calories).toBe(143);

      const bananaProposal = response.proposals[1];
      expect(bananaProposal.extractedFood).toBe("banana");
      expect(bananaProposal.quantity).toBe(1);
      expect(bananaProposal.unit).toBe("piece");
      expect(bananaProposal.status).toBe("matched");
      expect(bananaProposal.selectedCandidateId).toBe("banana1");
      expect(bananaProposal.candidates[0].preview.calories).toBe(105);
    });

    it("should return empty proposals when no foods are detected", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockResolvedValue({
        items: []
      });

      const response = await nutritionService.analyzeLog("I went for a run today");

      expect(response.proposals).toHaveLength(0);
    });

    it("should mark proposal as not_found when food has no database matches", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockResolvedValue({
        items: [
          { foodText: "mysterious moonfruit", quantity: 1, unit: "piece" }
        ]
      });

      (foodService.searchFoods as jest.Mock).mockResolvedValue([]);

      const response = await nutritionService.analyzeLog("I ate 1 mysterious moonfruit");

      expect(response.proposals).toHaveLength(1);
      expect(response.proposals[0].extractedFood).toBe("mysterious moonfruit");
      expect(response.proposals[0].status).toBe("not_found");
      expect(response.proposals[0].candidates).toHaveLength(0);
      expect(response.proposals[0].selectedCandidateId).toBeNull();
    });

    it("should mark proposal as ambiguous when multiple foods match", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockResolvedValue({
        items: [
          { foodText: "chicken", quantity: 200, unit: "g" }
        ]
      });

      const mockChicken1 = { _id: "c1", name: "Chicken Breast (Raw)", baseQuantity: 100, baseUnit: "g" };
      const mockChicken2 = { _id: "c2", name: "Chicken thigh, cooked", baseQuantity: 100, baseUnit: "g" };

      (foodService.searchFoods as jest.Mock).mockResolvedValue([mockChicken1, mockChicken2]);
      (foodService.calculateMacros as jest.Mock).mockResolvedValue({ calories: 330, protein: 62, carbs: 0, fat: 7 });

      const response = await nutritionService.analyzeLog("200g chicken");

      expect(response.proposals).toHaveLength(1);
      expect(response.proposals[0].status).toBe("ambiguous");
      expect(response.proposals[0].requiresReview).toBe(true);
      expect(response.proposals[0].candidates).toHaveLength(2);
      expect(response.proposals[0].selectedCandidateId).toBe("c1");
    });

    it("should mark foods with zero, negative, or non-finite quantities as not_found without silently defaulting to 1", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockResolvedValue({
        items: [
          { foodText: "paneer", quantity: 0, unit: "g" },
          { foodText: "banana", quantity: -2, unit: "piece" },
          { foodText: "milk", quantity: NaN, unit: "glass" },
          { foodText: "egg", quantity: Infinity, unit: "piece" }
        ]
      });

      const response = await nutritionService.analyzeLog("invalid items");

      expect(response.proposals).toHaveLength(4);
      expect(response.proposals[0].status).toBe("not_found");
      expect(response.proposals[0].candidates).toHaveLength(0);
      expect(response.proposals[1].status).toBe("not_found");
      expect(response.proposals[1].candidates).toHaveLength(0);
      expect(response.proposals[2].status).toBe("not_found");
      expect(response.proposals[2].candidates).toHaveLength(0);
      expect(response.proposals[3].status).toBe("not_found");
      expect(response.proposals[3].candidates).toHaveLength(0);
      expect(foodService.calculateMacros).not.toHaveBeenCalled();
    });

    it("should throw 429 when AI rate limit is reached", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockRejectedValue(new Error("429 Too Many Requests"));
      (classifyGeminiError as jest.Mock).mockReturnValue({
        isQuotaExhausted: false,
        isRateLimit: true,
        isServerError: false,
        isRetryable: true,
        retryAfterMs: null
      });

      await expect(nutritionService.analyzeLog("I had an apple")).rejects.toThrow(AppError);
      await expect(nutritionService.analyzeLog("I had an apple")).rejects.toMatchObject({ statusCode: 429 });
    });

    it("should throw 503 when AI provider is not configured", async () => {
      (AIProvider.extractFoodFromText as jest.Mock).mockRejectedValue(new Error("GEMINI_API_KEY is missing"));

      await expect(nutritionService.analyzeLog("I had an apple")).rejects.toThrow(AppError);
      await expect(nutritionService.analyzeLog("I had an apple")).rejects.toMatchObject({ statusCode: 503 });
    });
  });
});
