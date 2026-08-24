import { updateProfileSchema } from "../user.validation";

describe("User Profile Validation", () => {
  it("validates correct profile data", () => {
    const validData = {
      age: 25,
      gender: "male",
      height: 180,
      weight: 80,
      activityLevel: "active",
      fitnessGoal: "build_muscle",
    };
    
    // Actually the enum values are specific
    const validData2 = {
      age: 25,
      gender: "male",
      height: 180,
      weight: 80,
      activityLevel: "moderately_active",
      fitnessGoal: "build_muscle",
    };

    const result = updateProfileSchema.safeParse(validData2);
    expect(result.success).toBe(true);
  });

  it("rejects invalid age", () => {
    const result = updateProfileSchema.safeParse({ age: 5 });
    expect(result.success).toBe(false);

    const result2 = updateProfileSchema.safeParse({ age: 150 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid weight", () => {
    const result = updateProfileSchema.safeParse({ weight: 10 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid height", () => {
    const result = updateProfileSchema.safeParse({ height: 10 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    const result = updateProfileSchema.safeParse({ gender: "alien" });
    expect(result.success).toBe(false);

    const result2 = updateProfileSchema.safeParse({ activityLevel: "super_lazy" });
    expect(result.success).toBe(false);
  });
});
