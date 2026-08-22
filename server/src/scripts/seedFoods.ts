import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables before any other imports
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { foodRepository } from "../repositories/food.repository";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bodyforge";

async function seedFoods() {
  console.log("Starting Food DB Seeding...");
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    const dataPath = path.resolve(__dirname, "../data/indian-foods.json");
    const foodsRaw = fs.readFileSync(dataPath, "utf8");
    const foods = JSON.parse(foodsRaw);

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

    console.log(`Seeding completed. Inserted: ${inserted}, Updated: ${updated}, Failed: ${failed}`);
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

seedFoods();
