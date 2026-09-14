import { nutritionEntrySchema } from "./nutrition.validation";

describe("Nutrition Validation", () => {
  it("passes when quantity <= 10000", () => {
    const validData = {
      date: "2023-10-10",
      foodName: "Apple",
      quantity: 10000,
      unit: "g"
    };
    const result = nutritionEntrySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when quantity > 10000", () => {
    const invalidData = {
      date: "2023-10-10",
      foodName: "Apple",
      quantity: 10001,
      unit: "g"
    };
    const result = nutritionEntrySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
