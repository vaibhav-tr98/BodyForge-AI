import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import Workout from "../models/Workout";
import Program from "../models/Program";
import WorkoutSession from "../models/WorkoutSession";
import { DateEngine } from "../utils/dateEngine";
import jwt from "jsonwebtoken";

describe("Phase 8.1 Regression: isCompletedToday full flow", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId, email: "test@test.com" }, process.env.JWT_SECRET || "test-dummy-JWT_SECRET", { expiresIn: "1h" });

  let workoutId: string;
  let programId: string;

  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_regression";
    await mongoose.connect(mongoUri);
    await Workout.deleteMany({});
    await Program.deleteMany({});
    await WorkoutSession.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("should create a session, persist context, complete it, and show as completed today", async () => {
    // 1. Setup Workout
    const workout = await Workout.create({
      user: userId,
      name: "Regression Workout",
      exercises: []
    });
    workoutId = workout._id.toString();

    // 2. Setup Active Program
    const startDate = DateEngine.getCurrentDateInTimezone(new Date(), "UTC");
    const program = await Program.create({
      user: userId,
      name: "Regression Program",
      startDate,
      timezone: "UTC",
      status: "active",
      weeks: [{
        days: Array.from({ length: 7 }).map((_, i) => ({
          dayIndex: i,
          workoutId: workout._id
        }))
      }]
    });
    programId = program._id.toString();

    // 3. Start Session with programContext
    const startRes = await request(app)
      .post("/api/workout-sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        workoutId,
        programContext: {
          programId,
          programWeek: 0,
          programDay: 0
        }
      });

    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.data.session.id;
    expect(sessionId).toBeDefined();

    // 4. Verify persisted document contains program fields
    const persistedSession = await WorkoutSession.findById(sessionId);
    expect(persistedSession).toBeDefined();
    expect(persistedSession?.programId?.toString()).toBe(programId);
    expect(persistedSession?.programWeek).toBe(0);
    expect(persistedSession?.programDay).toBe(0);

    // 5. Complete the session
    const completeRes = await request(app)
      .post(`/api/workout-sessions/${sessionId}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(completeRes.status).toBe(200);

    // 6. Verify isCompletedToday is true
    const todayRes = await request(app)
      .get("/api/programs/active/today")
      .set("Authorization", `Bearer ${token}`);

    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.schedule.isCompletedToday).toBe(true);
  });

  it("should allow starting an ad-hoc session without programContext", async () => {
    const startRes = await request(app)
      .post("/api/workout-sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        workoutId
      });

    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.data.session.id;

    const persistedSession = await WorkoutSession.findById(sessionId);
    expect(persistedSession?.programId).toBeUndefined();
  });
});
