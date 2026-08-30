import mongoose from "mongoose";
import { env } from "../config/env";
import Food from "../models/Food";

// Use dynamic import or require for JSON so it works across ts-node and dist
import foods from "../data/nutrition-dataset.json";

export async function runFoodSeed() {
  console.log("Starting batched Food DB Seeding...");
  
  let totalProcessed = 0;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(foods.length / BATCH_SIZE);

  console.log(`Processing ${foods.length} foods in ${totalBatches} batches (size: ${BATCH_SIZE})...`);

  for (let i = 0; i < foods.length; i += BATCH_SIZE) {
    const batch = foods.slice(i, i + BATCH_SIZE);
    
    const operations = batch.map((food: any) => ({
      updateOne: {
        filter: { name: food.name },
        update: { $set: food },
        upsert: true
      }
    }));

    try {
      const result = await Food.bulkWrite(operations, { ordered: false });
      
      inserted += result.upsertedCount || 0;
      const matched = result.matchedCount || 0;
      updated += matched; // Anything matched is considered "updated" whether actually modified or unchanged.
      
      totalProcessed += batch.length;
    } catch (error: any) {
      console.error(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      
      if (error.result) {
        const batchUpserted = error.result.nUpserted || 0;
        const batchMatched = error.result.nMatched || 0;
        inserted += batchUpserted;
        updated += batchMatched;
        failed += batch.length - (batchUpserted + batchMatched);
      } else {
        failed += batch.length;
      }
    }
  }

  console.log(`Food Seeding completed!`);
  console.log(`- Total Batches: ${totalBatches}`);
  console.log(`- Total Records: ${foods.length}`);
  console.log(`- Inserted: ${inserted}`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Failed: ${failed}`);
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
