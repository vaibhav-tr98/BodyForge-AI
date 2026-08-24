import { nutritionTargetService } from "./nutritionTarget.service";
import { IUser } from "../models/User";

describe("NutritionTargetService", () => {
  const getBaseUser = (): Partial<IUser> => ({
    age: 30,
    gender: "male",
    height: 180,
    weight: 80,
    activityLevel: "moderately_active",
    fitnessGoal: "maintain",
  });

  describe("Profile Completeness", () => {
    it("should return null if age is missing", () => {
      const user = { ...getBaseUser(), age: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });

    it("should return null if gender is missing", () => {
      const user = { ...getBaseUser(), gender: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });

    it("should return null if height is missing", () => {
      const user = { ...getBaseUser(), height: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });

    it("should return null if weight is missing", () => {
      const user = { ...getBaseUser(), weight: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });

    it("should return null if activityLevel is missing", () => {
      const user = { ...getBaseUser(), activityLevel: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });

    it("should return null if fitnessGoal is missing", () => {
      const user = { ...getBaseUser(), fitnessGoal: undefined } as any;
      expect(nutritionTargetService.calculateTargets(user)).toBeNull();
    });
  });

  describe("BMR and Gender Calculation", () => {
    it("should calculate correct targets for a male", () => {
      const user = { ...getBaseUser(), gender: "male" } as any;
      const targets = nutritionTargetService.calculateTargets(user);
      
      // Male BMR: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
      // TDEE (moderately_active = 1.55): 1780 * 1.55 = 2759
      expect(targets?.calories).toBe(2759);
    });

    it("should calculate correct targets for a female", () => {
      const user = { ...getBaseUser(), gender: "female" } as any;
      const targets = nutritionTargetService.calculateTargets(user);
      
      // Female BMR: 10 * 80 + 6.25 * 180 - 5 * 30 - 161 = 800 + 1125 - 150 - 161 = 1614
      // TDEE: 1614 * 1.55 = 2501.7 -> 2502
      expect(targets?.calories).toBe(2502);
    });

    it("should calculate correct targets for a neutral gender", () => {
      const user = { ...getBaseUser(), gender: "other" } as any;
      const targets = nutritionTargetService.calculateTargets(user);
      
      // Midpoint BMR: (1780 + 1614) / 2 = 1697
      // TDEE: 1697 * 1.55 = 2630.35 -> 2630
      expect(targets?.calories).toBe(2630);
    });
  });

  describe("Activity Multipliers", () => {
    it("should calculate correct targets for sedentary", () => {
      const user = { ...getBaseUser(), activityLevel: "sedentary" } as any; // Male BMR 1780
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(Math.round(1780 * 1.20));
    });

    it("should calculate correct targets for lightly_active", () => {
      const user = { ...getBaseUser(), activityLevel: "lightly_active" } as any;
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(Math.round(1780 * 1.375));
    });

    it("should calculate correct targets for very_active", () => {
      const user = { ...getBaseUser(), activityLevel: "very_active" } as any;
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(Math.round(1780 * 1.725));
    });
  });

  describe("Fitness Goal Adjustments", () => {
    it("should adjust calories and protein for lose_fat", () => {
      const user = { ...getBaseUser(), activityLevel: "sedentary", fitnessGoal: "lose_fat" } as any; 
      // TDEE: 1780 * 1.2 = 2136
      // Calorie adjustment: 0.8 => 2136 * 0.8 = 1708.8 -> 1709
      // Protein: 80 * 2.0 = 160
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(1709);
      expect(targets?.protein).toBe(160);
    });

    it("should adjust calories and protein for build_muscle", () => {
      const user = { ...getBaseUser(), activityLevel: "sedentary", fitnessGoal: "build_muscle" } as any; 
      // Calorie adjustment: 1.1 => 2136 * 1.1 = 2349.6 -> 2350
      // Protein: 80 * 2.0 = 160
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(2350);
      expect(targets?.protein).toBe(160);
    });

    it("should adjust calories and protein for maintain", () => {
      const user = { ...getBaseUser(), activityLevel: "sedentary", fitnessGoal: "maintain" } as any; 
      // Calorie adjustment: 1.0 => 2136
      // Protein: 80 * 1.6 = 128
      const targets = nutritionTargetService.calculateTargets(user);
      expect(targets?.calories).toBe(2136);
      expect(targets?.protein).toBe(128);
    });
  });

  describe("Determinism", () => {
    it("should return the exact same result for repeated calls with same input", () => {
      const user = getBaseUser() as any;
      const result1 = nutritionTargetService.calculateTargets(user);
      const result2 = nutritionTargetService.calculateTargets(user);
      expect(result1).toEqual(result2);
    });
  });
});
