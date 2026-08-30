import mongoose from "mongoose";
import Exercise from "../models/Exercise";
import { env } from "../config/env";
import logger from "../utils/logger";

const DB_URI = env.mongoUri;
const DATASET_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

// The shape of the JSON in the external dataset
interface ExternalExercise {
  id: string;
  name: string;
  force: string | null;
  level: "beginner" | "intermediate" | "expert" | string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// Map the dataset level to our difficulty enum
const mapDifficulty = (level: string): "beginner" | "intermediate" | "advanced" => {
  if (level === "expert") return "advanced";
  if (level === "beginner" || level === "intermediate") return level;
  return "intermediate"; // default fallback
};

export async function runExerciseSeed() {
  logger.info(`Fetching external dataset from ${DATASET_URL}...`);
  const response = await fetch(DATASET_URL);
  const exercises: ExternalExercise[] = await response.json();
  logger.info(`Fetched ${exercises.length} exercises from dataset.`);

  logger.info("Preparing bulk operations...");
  const bulkOps = exercises.map((ex: ExternalExercise) => {
    const mappedData = {
      name: ex.name,
      category: ex.category || undefined,
      equipment: ex.equipment || undefined,
      primaryMuscles: ex.primaryMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      difficulty: mapDifficulty(ex.level),
      instructions: ex.instructions || [],
    };

    // Upsert by exact name to prevent duplicates
    return {
      updateOne: {
        filter: { name: ex.name },
        update: { $set: mappedData },
        upsert: true,
      },
    };
  });

  logger.info("Executing bulk write...");
  const result = await Exercise.bulkWrite(bulkOps);

  logger.info("Seed Summary:");
  logger.info(`- Dataset total: ${exercises.length}`);
  logger.info(`- Inserted: ${result.upsertedCount}`);
  logger.info(`- Updated: ${result.modifiedCount}`);
  logger.info(`- Matched (skipped updates): ${result.matchedCount - result.modifiedCount}`);
}

async function seedExercises() {
  try {
    logger.info("Connecting to MongoDB for seeding...");
    await mongoose.connect(DB_URI);
    logger.info("Connected successfully.");

    await runExerciseSeed();

  } catch (error) {
    logger.error("Failed to seed exercises:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB.");
    process.exit(0);
  }
}

if (require.main === module) {
  seedExercises();
}
