import mongoose from "mongoose";
import { env } from "../config/env";
import { foodRepository } from "../repositories/food.repository";

// Use dynamic import or require for JSON so it works across ts-node and dist
import foods from "../data/indian-foods.json";

export async function runFoodSeed() {
  console.log("Starting Food DB Seeding...");
  
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const food of foods) {
    try {
      const existing = await foodRepository.getFoodByName(food.name);
      if (existing) {
        await foodRepository.createOrUpdateFood(food);
        updated++;
      } else {
        await foodRepository.createOrUpdateFood(food);
        inserted++;
      }
    } catch (error) {
      console.error(`Failed to insert/update ${food.name}:`, error);
      failed++;
    }
  }

  console.log(`Food Seeding completed. Inserted: ${inserted}, Updated: ${updated}, Failed: ${failed}`);
}

async function seedFoods() {
  try {
    console.log("Connecting to MongoDB for standalone food seeding...");
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB.");

    await runFoodSeed();
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

if (require.main === module) {
  seedFoods();
}
