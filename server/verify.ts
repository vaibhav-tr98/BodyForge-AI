import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "./src/models/User";
import { analyticsService } from "./src/services/analytics.service";
import { workoutRecommendationService } from "./src/services/workoutRecommendation.service";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const user = await User.findOne({ email: "test@example.com" }) || await User.findOne();
  if (user) {
    const userId = user._id.toString();
    console.log("=== USER ID ===", userId);
    
    // Check endpoints via services directly
    const readiness = await analyticsService.getTrainingReadiness(userId);
    console.log("\n=== READINESS ===");
    console.log(JSON.stringify(readiness, null, 2));

    const today = await workoutRecommendationService.getTodayRecommendation(userId);
    console.log("\n=== TODAY'S RECOMMENDATION ===");
    console.log(JSON.stringify(today, null, 2));
    
  } else {
    console.log("No user found.");
  }
  process.exit(0);
}
run();
