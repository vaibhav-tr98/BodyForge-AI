import { userRepository } from "../repositories/user.repository";
import { workoutSessionRepository } from "../repositories/workoutSession.repository";
import { programRepository } from "../repositories/program.repository";
import { analyticsService } from "./analytics.service";
import { nutritionService } from "./nutrition.service";
import { nutritionTargetService } from "./nutritionTarget.service";
import { DateEngine } from "../utils/dateEngine";
import {
  FitnessContext,
  UserFitnessProfile,
  TrainingProgramContext,
  RecentWorkoutSummary,
  WorkoutExerciseSummary,
  PersonalRecordSummary,
  ReadinessContext,
  NutritionDaySummary,
  NutritionTargetsContext,
} from "../types/fitnessContext.types";

export class FitnessContextService {
  /**
   * Securely assemble bounded, personalized fitness context for an authenticated user.
   * All database queries are strictly scoped to the authenticated userId.
   */
  public async assembleFitnessContext(userId: string): Promise<FitnessContext> {
    const user = await userRepository.findById(userId);
    const timezone = DateEngine.getValidTimezone(user?.timezone);

    // Parallel fetch with resilient fallbacks
    const [
      activeProgramResult,
      recentWorkoutsResult,
      prResult,
      readinessResult,
      nutritionHistoryResult,
    ] = await Promise.allSettled([
      programRepository.findActiveProgram(userId),
      workoutSessionRepository.findRecentCompletedDetailed(userId, 5),
      analyticsService.getPersonalRecordsAndInsights(userId),
      analyticsService.getTrainingReadiness(userId),
      nutritionService.getHistory(userId, undefined, undefined, 3, timezone),
    ]);

    // 1. Profile Context
    const profile: UserFitnessProfile = {
      age: user?.age ?? null,
      gender: user?.gender ?? null,
      heightCm: user?.height ?? null,
      weightKg: user?.weight ?? null,
      fitnessGoal: user?.fitnessGoal || user?.goal || null,
      experienceLevel: user?.experience || null,
      activityLevel: user?.activityLevel || null,
      timezone,
    };

    // 2. Training Context
    let activeProgram: TrainingProgramContext | null = null;
    if (activeProgramResult.status === "fulfilled" && activeProgramResult.value) {
      const prog = activeProgramResult.value;
      let currentPosition = null;

      if (prog.startDate) {
        const pos = DateEngine.getProgramPosition(new Date(), prog.startDate, timezone);
        if (pos.hasStarted) {
          currentPosition = {
            week: pos.week + 1,
            day: pos.day + 1,
            description: `Week ${pos.week + 1}, Day ${pos.day + 1}`,
          };
        } else {
          currentPosition = {
            week: 0,
            day: 0,
            description: "Starts in the future",
          };
        }
      }

      activeProgram = {
        name: prog.name,
        status: prog.status,
        startDate: prog.startDate,
        currentPosition,
      };
    }

    const recentWorkouts: RecentWorkoutSummary[] = [];
    if (recentWorkoutsResult.status === "fulfilled" && recentWorkoutsResult.value) {
      for (const session of recentWorkoutsResult.value) {
        const completedDate = session.completedAt || session.startedAt || new Date();
        const dateStr = DateEngine.getCurrentDateInTimezone(new Date(completedDate), timezone);

        const workoutName =
          (session.workout as { name?: string })?.name || "Custom Workout";

        let sessionVolume = 0;
        const exercisesSummary: WorkoutExerciseSummary[] = [];

        if (Array.isArray(session.exercises)) {
          for (const ex of session.exercises) {
            const completedSets = (ex.sets || []).filter((s) => s.completed);
            let exVolume = 0;
            let topSet: { weight: number; reps: number } | null = null;

            for (const set of completedSets) {
              const weight = set.weight || 0;
              const reps = set.reps || 0;
              exVolume += weight * reps;

              if (!topSet || weight > topSet.weight || (weight === topSet.weight && reps > topSet.reps)) {
                topSet = { weight, reps };
              }
            }

            sessionVolume += exVolume;

            if (completedSets.length > 0) {
              exercisesSummary.push({
                exerciseName: ex.exerciseName,
                completedSetsCount: completedSets.length,
                topSet,
                totalVolume: exVolume,
              });
            }
          }
        }

        recentWorkouts.push({
          id: session._id.toString(),
          name: workoutName,
          date: dateStr,
          totalVolume: sessionVolume,
          exerciseCount: exercisesSummary.length,
          exercises: exercisesSummary,
        });
      }
    }

    const topPersonalRecords: PersonalRecordSummary[] = [];
    if (prResult.status === "fulfilled" && prResult.value?.personalRecords) {
      // Pick top 5 PRs
      const prs = prResult.value.personalRecords.slice(0, 5);
      for (const pr of prs) {
        topPersonalRecords.push({
          exerciseName: pr.exerciseName,
          heaviestWeight: pr.heaviestWeight,
          bestReps: pr.bestReps,
          bestSessionVolume: pr.bestSessionVolume,
          firstRecordedWeight: pr.firstRecordedWeight,
          weightImprovementPercent: pr.weightImprovementPercent,
          lastPerformedAt: pr.lastPerformedAt,
        });
      }
    }

    let readiness: ReadinessContext | null = null;
    if (readinessResult.status === "fulfilled" && readinessResult.value) {
      const r = readinessResult.value;
      readiness = {
        overallScore: r.overallScore,
        status: r.status,
        freshMuscles: (r.muscleGroups || [])
          .filter((m) => m.status === "ready")
          .map((m) => m.muscle),
        fatiguedMuscles: (r.muscleGroups || [])
          .filter((m) => m.status === "recent" || m.status === "light")
          .map((m) => m.muscle),
      };
    }

    // 3. Nutrition Context
    let targets: NutritionTargetsContext | null = null;
    if (user) {
      const calculated = nutritionTargetService.calculateTargets(user);
      if (calculated) {
        targets = {
          calories: calculated.calories,
          protein: calculated.protein,
          calculationMethod: calculated.calculationMethod,
        };
      }
    }

    const recentSummaries: NutritionDaySummary[] = [];
    if (nutritionHistoryResult.status === "fulfilled" && nutritionHistoryResult.value?.days) {
      for (const day of nutritionHistoryResult.value.days) {
        let status = "logged";
        if (targets?.calories && day.calories > 0) {
          if (day.calories >= targets.calories) {
            status = "target_reached";
          } else if (day.calories >= targets.calories * 0.85) {
            status = "on_track";
          } else {
            status = "below_target";
          }
        } else if (day.entryCount === 0) {
          status = "no_data";
        }

        recentSummaries.push({
          date: day.date,
          calories: day.calories,
          protein: day.protein,
          carbs: day.carbs,
          fat: day.fat,
          entryCount: day.entryCount,
          status,
        });
      }
    }

    return {
      assembledAt: new Date().toISOString(),
      profile,
      training: {
        activeProgram,
        recentWorkouts,
        topPersonalRecords,
        readiness,
      },
      nutrition: {
        targets,
        recentSummaries,
      },
    };
  }

  /**
   * Format structured fitness context into grounded Markdown for Gemini system instructions.
   */
  public formatContextForPrompt(ctx: FitnessContext): string {
    const lines: string[] = [];

    // Profile Section
    lines.push("### ATHLETE PROFILE");
    lines.push(`- Goal: ${ctx.profile.fitnessGoal || "Not specified"}`);
    lines.push(`- Experience Level: ${ctx.profile.experienceLevel || "Not specified"}`);
    lines.push(`- Activity Level: ${ctx.profile.activityLevel || "Not specified"}`);
    lines.push(`- Age: ${ctx.profile.age !== null ? ctx.profile.age : "Not provided"}`);
    lines.push(`- Gender: ${ctx.profile.gender || "Not provided"}`);
    lines.push(`- Height: ${ctx.profile.heightCm !== null ? `${ctx.profile.heightCm} cm` : "Not provided"}`);
    lines.push(`- Weight: ${ctx.profile.weightKg !== null ? `${ctx.profile.weightKg} kg` : "Not provided"}`);
    lines.push(`- Local Timezone: ${ctx.profile.timezone}`);

    // Training Section
    lines.push("\n### ACTIVE TRAINING PROGRAM");
    if (ctx.training.activeProgram) {
      const p = ctx.training.activeProgram;
      lines.push(`- Program: ${p.name} (Status: ${p.status})`);
      if (p.currentPosition) {
        lines.push(`- Current Position: ${p.currentPosition.description}`);
      }
    } else {
      lines.push("- No active training program currently assigned.");
    }

    lines.push("\n### RECENT COMPLETED WORKOUTS (LAST 7 DAYS)");
    if (ctx.training.recentWorkouts.length > 0) {
      for (const w of ctx.training.recentWorkouts) {
        lines.push(`- ${w.date} — ${w.name} (${w.exerciseCount} exercises, total volume: ${w.totalVolume.toLocaleString()} kg)`);
        for (const ex of w.exercises) {
          const topSetStr = ex.topSet ? `Top set: ${ex.topSet.weight} kg x ${ex.topSet.reps} reps` : "Bodyweight";
          lines.push(`  * ${ex.exerciseName}: ${ex.completedSetsCount} completed sets (${topSetStr})`);
        }
      }
    } else {
      lines.push("- No completed workouts recorded in the last 7 days.");
    }

    lines.push("\n### PERSONAL RECORDS (TOP EXERCISES)");
    if (ctx.training.topPersonalRecords.length > 0) {
      for (const pr of ctx.training.topPersonalRecords) {
        const impStr =
          pr.weightImprovementPercent !== null && pr.weightImprovementPercent !== undefined
            ? ` (${pr.weightImprovementPercent >= 0 ? "+" : ""}${pr.weightImprovementPercent.toFixed(1)}% improvement)`
            : "";
        lines.push(`- ${pr.exerciseName}: Heaviest ${pr.heaviestWeight} kg, Best reps: ${pr.bestReps}${impStr}`);
      }
    } else {
      lines.push("- No personal records recorded yet.");
    }

    lines.push("\n### TRAINING READINESS & RECOVERY");
    if (ctx.training.readiness) {
      const r = ctx.training.readiness;
      lines.push(`- Readiness Score: ${r.overallScore}/100 (${r.status})`);
      lines.push(`- Fresh / Ready Muscle Groups: ${r.freshMuscles.join(", ") || "None highlighted"}`);
      lines.push(`- Fatigued / Recovering Muscle Groups: ${r.fatiguedMuscles.join(", ") || "None"}`);
    } else {
      lines.push("- Training readiness: Insufficient workout history to compute recovery score.");
    }

    // Nutrition Section
    lines.push("\n### NUTRITION & TARGET COMPLIANCE");
    if (ctx.nutrition.targets) {
      lines.push(
        `- Daily Calorie Target: ${ctx.nutrition.targets.calories} kcal (${ctx.nutrition.targets.calculationMethod})`
      );
      lines.push(`- Daily Protein Target: ${ctx.nutrition.targets.protein} g`);
    } else {
      lines.push("- Daily Nutrition Targets: Not set (profile lacks required age/gender/height/weight/activity metrics).");
    }

    if (ctx.nutrition.recentSummaries.length > 0) {
      lines.push("- Recent Daily Logs:");
      for (const s of ctx.nutrition.recentSummaries) {
        if (s.entryCount > 0) {
          lines.push(
            `  * ${s.date}: ${s.calories} kcal, ${s.protein}g protein, ${s.carbs}g carbs, ${s.fat}g fat (${s.status})`
          );
        } else {
          lines.push(`  * ${s.date}: No food logged`);
        }
      }
    } else {
      lines.push("- No food logs available for recent days.");
    }

    return lines.join("\n");
  }
}

export const fitnessContextService = new FitnessContextService();
export default fitnessContextService;
