import mongoose from "mongoose";
import dotenv from "dotenv";
import { workoutRecommendationService } from "./src/services/workoutRecommendation.service";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const userId = "6a7a1924cb3709498c284093"; // User from previous test

  const today = await workoutRecommendationService.getTodayRecommendation("6a7ee7b84eeaa32c0ca5c1ff");
  console.log("\n=== TODAY'S RECOMMENDATION (Test User) ===");
  console.log(JSON.stringify(today, null, 2));
  
  process.exit(0);
}
run();
