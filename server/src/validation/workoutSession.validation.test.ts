import { updateSessionSchema } from "./workoutSession.validation";

describe("Workout Session Validation", () => {
  it("passes when exercises <= 100 and sets <= 50", () => {
    const validData = {
      exercises: [
        {
          exerciseName: "Bench Press",
          plannedSets: 3,
          plannedReps: 10,
          sets: [
            { setNumber: 1, weight: 100, reps: 10, completed: true }
          ]
        }
      ]
    };
    const result = updateSessionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when exercises > 100", () => {
    const manyExercises = Array.from({ length: 101 }, (_, i) => ({
      exerciseName: `Exercise ${i}`,
      plannedSets: 1,
      plannedReps: 1,
      sets: []
    }));
    
    const result = updateSessionSchema.safeParse({ exercises: manyExercises });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Maximum of 100 exercises");
    }
  });

  it("fails when sets > 50", () => {
    const manySets = Array.from({ length: 51 }, (_, i) => ({
      setNumber: i + 1,
      weight: 100,
      reps: 10,
      completed: true
    }));
    
    const data = {
      exercises: [
        {
          exerciseName: "Bench Press",
          plannedSets: 1,
          plannedReps: 1,
          sets: manySets
        }
      ]
    };
    
    const result = updateSessionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Maximum of 50 sets");
    }
  });
});
