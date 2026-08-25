import { progressService } from "./progress.service";
import { 
  ProgressInsightDTO, 
  ProgressInsightType, 
  ProgressInsightPriority, 
  ProgressInsightContext 
} from "../types/progressInsight.types";

const WEIGHT_CHANGE_THRESHOLD = 0.25;
const BODY_FAT_CHANGE_THRESHOLD = 0.5;
const WAIST_CHANGE_THRESHOLD = 0.5;

export class ProgressInsightService {
  async getProgressInsight(userId: string): Promise<ProgressInsightDTO> {
    const historyDesc = await progressService.getProgressHistory(userId);

    const baseContext: ProgressInsightContext = {
      currentWeight: null,
      previousWeight: null,
      weightChange: null,
      currentBodyFat: null,
      previousBodyFat: null,
      bodyFatChange: null,
      currentWaist: null,
      previousWaist: null,
      waistChange: null,
      daysTracked: historyDesc.length,
    };

    if (!historyDesc || historyDesc.length === 0) {
      return this.createInsight(
        "no_history",
        "high",
        "Start tracking your progress",
        "Record your first progress measurement to establish your baseline.",
        baseContext
      );
    }

    if (historyDesc.length === 1) {
      const entry = historyDesc[0];
      return this.createInsight(
        "insufficient_history",
        "medium",
        "Keep tracking your progress",
        "Add another progress entry to start seeing meaningful trends.",
        {
          ...baseContext,
          currentWeight: entry.weight || null,
          currentBodyFat: entry.bodyFatPercentage || null,
          currentWaist: entry.waist || null,
        }
      );
    }

    // historyDesc is sorted newest first
    const current = historyDesc[0];
    const previous = historyDesc[1];

    const currentWeight = current.weight || null;
    const previousWeight = previous.weight || null;
    const weightChange = currentWeight !== null && previousWeight !== null ? Number((currentWeight - previousWeight).toFixed(2)) : null;

    const currentBodyFat = current.bodyFatPercentage ?? null;
    const previousBodyFat = previous.bodyFatPercentage ?? null;
    const bodyFatChange = currentBodyFat !== null && previousBodyFat !== null ? Number((currentBodyFat - previousBodyFat).toFixed(2)) : null;

    const currentWaist = current.waist || null;
    const previousWaist = previous.waist || null;
    const waistChange = currentWaist !== null && previousWaist !== null ? Number((currentWaist - previousWaist).toFixed(2)) : null;

    const context: ProgressInsightContext = {
      currentWeight,
      previousWeight,
      weightChange,
      currentBodyFat,
      previousBodyFat,
      bodyFatChange,
      currentWaist,
      previousWaist,
      waistChange,
      daysTracked: historyDesc.length,
    };

    // RULE 3 — BODY FAT IMPROVEMENT
    if (bodyFatChange !== null && bodyFatChange <= -BODY_FAT_CHANGE_THRESHOLD) {
      return this.createInsight(
        "body_fat_improvement",
        "high",
        "Body fat improvement",
        `Your body fat has decreased by ${Math.abs(bodyFatChange)} percentage points since your previous measurement.`,
        context
      );
    }

    // RULE 4 — BODY FAT INCREASE
    if (bodyFatChange !== null && bodyFatChange >= BODY_FAT_CHANGE_THRESHOLD) {
      return this.createInsight(
        "body_fat_increase",
        "medium",
        "Body fat increase",
        `Your body fat increased by ${bodyFatChange} percentage points since your previous measurement.`,
        context
      );
    }

    // RULE 5 — WAIST / MEASUREMENT IMPROVEMENT
    if (waistChange !== null && waistChange <= -WAIST_CHANGE_THRESHOLD) {
      return this.createInsight(
        "measurement_improvement",
        "medium",
        "Measurement improvement",
        `Your waist measurement is down by ${Math.abs(waistChange)} cm since your previous entry.`,
        context
      );
    }

    // RULE 6 — WEIGHT LOSS
    if (weightChange !== null && weightChange <= -WEIGHT_CHANGE_THRESHOLD) {
      return this.createInsight(
        "weight_loss",
        "low",
        "Weight loss",
        `Your weight is down ${Math.abs(weightChange)} kg since your previous measurement.`,
        context
      );
    }

    // RULE 7 — WEIGHT GAIN
    if (weightChange !== null && weightChange >= WEIGHT_CHANGE_THRESHOLD) {
      return this.createInsight(
        "weight_gain",
        "low",
        "Weight gain",
        `Your weight is up ${weightChange} kg since your previous measurement.`,
        context
      );
    }

    // RULE 8 — WEIGHT STABLE
    return this.createInsight(
      "weight_stable",
      "low",
      "Weight stable",
      "Your weight has remained stable since your previous measurement.",
      context
    );
  }

  private createInsight(
    type: ProgressInsightType,
    priority: ProgressInsightPriority,
    title: string,
    message: string,
    context: ProgressInsightContext
  ): ProgressInsightDTO {
    return {
      type,
      priority,
      title,
      message,
      context,
    };
  }
}

export const progressInsightService = new ProgressInsightService();
