const mongoose = require("mongoose");
const WorkoutSession = require("./src/models/WorkoutSession").default;
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const session = await WorkoutSession.findOne({ status: "completed" });
  if (session) {
    console.log("Found user ID:", session.user);
  } else {
    console.log("No completed sessions found.");
  }
  process.exit(0);
}
run();
