const mongoose = require("mongoose");
require("dotenv").config({ path: "server/.env" });
const { analyticsService } = require("./server/dist/services/analytics.service");
const { User } = require("./server/dist/models/User");

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const user = await User.findOne();
  console.log("User:", user._id);
  try {
    const data = await analyticsService.getDashboardAnalytics(user._id.toString());
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();
