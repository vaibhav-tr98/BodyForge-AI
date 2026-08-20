import mongoose from "mongoose";
import WorkoutSession from "./src/models/WorkoutSession";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const session = await WorkoutSession.findOne({ status: "completed" });
  if (session) {
    console.log("Found user ID:", session.user.toString());
  } else {
    console.log("No completed sessions found.");
  }
  process.exit(0);
}
run();
