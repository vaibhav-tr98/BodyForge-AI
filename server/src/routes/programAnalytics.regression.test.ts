
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import User from "../models/User";
import Program from "../models/Program";
import WorkoutSession from "../models/WorkoutSession";
import jwt from "jsonwebtoken";

describe("Phase 8.2 Program Analytics Historical Adherence", () => {
  let token: string;
  let user: any;
  let programId: string;

  beforeAll(async () => {
    // Setup test DB connection here if not handled globally by jest setup
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/bodyforge_test");
    }

    user = await User.create({
      name: "Analytics Regression User",
      email: "analytics.regression@test.com",
      password: "password123",
    });

    token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: "analytics.regression@test.com" });
    await Program.deleteMany({ user: user._id });
    await WorkoutSession.deleteMany({ user: user._id });
  });

  it("should preserve completed session adherence even if program schedule is later changed", async () => {
    // 1. Create Program with Week 1 Day 1 as a Workout Day
    const program = await Program.create({
      user: user._id,
      name: "Test Analytics Program",
      description: "Testing historical changes",
      startDate: new Date().toISOString().split("T")[0],
      timezone: "America/New_York",
      status: "active",
      weeks: [
        {
          days: [
            { dayIndex: 0, workoutId: new mongoose.Types.ObjectId() },
            { dayIndex: 1, workoutId: null },
            { dayIndex: 2, workoutId: null },
            { dayIndex: 3, workoutId: null },
            { dayIndex: 4, workoutId: null },
            { dayIndex: 5, workoutId: null },
            { dayIndex: 6, workoutId: null }
          ]
        }
      ]
    });
    programId = program._id.toString();

    // 2. Create and complete a scheduled WorkoutSession for Week 1 Day 1
    const session = await WorkoutSession.create({
      user: user._id,
      programId: program._id,
      programWeek: 0,
      programDay: 0,
      workout: new mongoose.Types.ObjectId(), // Add required field
      status: "completed",
      startTime: new Date(),
      completedAt: new Date(),
      duration: 3600,
      exercises: [] // Emtpy sets for pure adherence test
    });

    // 3. Verify analytics before schedule change
    let res = await request(app)
      .get(`/api/programs/${programId}/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.adherence.completedSessions).toBe(1);

    // 4. Change the Program schedule retrospectively (make Week 1 Day 1 a rest day)
    program.weeks[0].days[0].workoutId = null;
    await program.save();

    // 5. Verify analytics after schedule change
    // The completed session must STILL count toward completedSessions.
    res = await request(app)
      .get(`/api/programs/${programId}/analytics`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.adherence.completedSessions).toBe(1);
    // Because it is now a rest day, it gets conditionally ADDED to elapsed schedules precisely BECAUSE it was completed.
  });
});

