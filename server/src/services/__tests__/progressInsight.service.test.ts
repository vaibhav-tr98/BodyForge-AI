import { ProgressInsightService } from "../progressInsight.service";
import { progressService } from "../progress.service";

// Mock the progressService
jest.mock("../progress.service", () => ({
  progressService: {
    getProgressHistory: jest.fn(),
  },
}));

describe("ProgressInsightService", () => {
  let service: ProgressInsightService;

  beforeEach(() => {
    service = new ProgressInsightService();
    jest.clearAllMocks();
  });

  it("should return no_history if no records exist", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("no_history");
    expect(result.priority).toBe("high");
    expect(result.title).toBe("Start tracking your progress");
    expect(result.message).toBe("Record your first progress measurement to establish your baseline.");
    expect(result.context.daysTracked).toBe(0);
  });

  it("should return insufficient_history if only one record exists", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 80, bodyFatPercentage: 20, waist: 85 }
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("insufficient_history");
    expect(result.priority).toBe("medium");
    expect(result.title).toBe("Keep tracking your progress");
    expect(result.context.currentWeight).toBe(80);
    expect(result.context.currentBodyFat).toBe(20);
    expect(result.context.currentWaist).toBe(85);
    expect(result.context.daysTracked).toBe(1);
  });

  it("should return weight_loss if weight decreased meaningfully", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79 }, // newer
      { weight: 80 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("weight_loss");
    expect(result.priority).toBe("low");
    expect(result.context.weightChange).toBe(-1);
  });

  it("should return weight_gain if weight increased meaningfully", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 81 }, // newer
      { weight: 80 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("weight_gain");
    expect(result.priority).toBe("low");
    expect(result.context.weightChange).toBe(1);
  });

  it("should return weight_stable if weight change is within tolerance", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 80.1 }, // newer
      { weight: 80 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("weight_stable");
    expect(result.priority).toBe("low");
  });

  it("should return body_fat_improvement if body fat decreased meaningfully", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, bodyFatPercentage: 19 }, // newer
      { weight: 80, bodyFatPercentage: 20 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("body_fat_improvement");
    expect(result.priority).toBe("high");
    expect(result.context.bodyFatChange).toBe(-1);
  });

  it("should return body_fat_increase if body fat increased meaningfully", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 81, bodyFatPercentage: 21 }, // newer
      { weight: 80, bodyFatPercentage: 20 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("body_fat_increase");
    expect(result.priority).toBe("medium");
    expect(result.context.bodyFatChange).toBe(1);
  });

  it("should return measurement_improvement if waist decreased meaningfully", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 80, waist: 84 }, // newer
      { weight: 80, waist: 85 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("measurement_improvement");
    expect(result.priority).toBe("medium");
    expect(result.context.waistChange).toBe(-1);
  });

  it("should handle missing body-fat data gracefully and fallback to weight", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79 }, // newer (no body fat)
      { weight: 80, bodyFatPercentage: 20 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("weight_loss"); // Falls back to weight_loss
  });

  it("should handle missing waist data gracefully and fallback to weight", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, bodyFatPercentage: 20 }, // newer (no waist, stable BF)
      { weight: 80, bodyFatPercentage: 20, waist: 85 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("weight_loss");
  });

  it("should process only the latest two records for insight generation", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 79, bodyFatPercentage: 19 }, // latest
      { weight: 80, bodyFatPercentage: 20 }, // previous
      { weight: 85, bodyFatPercentage: 25 }  // older
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("body_fat_improvement");
    expect(result.context.previousWeight).toBe(80);
    expect(result.context.daysTracked).toBe(3);
  });

  it("should enforce priority (body_fat_improvement wins over weight_gain)", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 81, bodyFatPercentage: 19 }, // gained weight, but lost BF
      { weight: 80, bodyFatPercentage: 20 }  
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("body_fat_improvement");
    expect(result.priority).toBe("high");
    expect(result.context.weightChange).toBe(1);
    expect(result.context.bodyFatChange).toBe(-1);
  });

  it("should enforce priority (waist improvement wins over weight_loss/gain if BF is stable)", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 81, waist: 84 }, // gained weight, but lost waist
      { weight: 80, waist: 85 }  
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("measurement_improvement");
    expect(result.priority).toBe("medium");
  });

  it("should respect threshold boundary conditions (e.g. exactly 0.5 BF loss)", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([
      { weight: 80, bodyFatPercentage: 19.5 }, 
      { weight: 80, bodyFatPercentage: 20.0 }  
    ]);

    const result = await service.getProgressInsight("user1");

    expect(result.type).toBe("body_fat_improvement");
    expect(result.context.bodyFatChange).toBe(-0.5);
  });

  it("should ensure user isolation by passing the correct userId", async () => {
    (progressService.getProgressHistory as jest.Mock).mockResolvedValue([]);

    await service.getProgressInsight("user-123");

    expect(progressService.getProgressHistory).toHaveBeenCalledWith("user-123");
  });
});
