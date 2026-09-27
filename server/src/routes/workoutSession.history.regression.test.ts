import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import Workout from "../models/Workout";
import WorkoutSession from "../models/WorkoutSession";
import User from "../models/User";
import jwt from "jsonwebtoken";
import { SafeWorkoutSession } from "../services/workoutSession.service";

describe("WorkoutSession History API - Deleted Workout Crash Regression", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId, email: "test@history.com" }, process.env.JWT_SECRET || "test-dummy-JWT_SECRET", { expiresIn: "1h" });

  let populatedWorkoutId: string;
  let deletedWorkoutId: string;

  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_history_crash";
    await mongoose.connect(mongoUri);
    await Workout.deleteMany({});
    await WorkoutSession.deleteMany({});
    await User.deleteMany({});

    // Create a mock user
    await User.create({
      _id: userId,
      name: "History User",
      email: "test@history.com",
      password: "password123"
    });

    // 1. Create a workout that will remain (Populated)
    const activeWorkout = await Workout.create({
      user: userId,
      name: "Active Workout",
      description: "Will remain in DB",
      exercises: []
    });
    populatedWorkoutId = activeWorkout._id.toString();

    // 2. Create a workout that will be deleted
    const workoutToDelete = await Workout.create({
      user: userId,
      name: "Deleted Workout",
      description: "Will be deleted before fetch",
      exercises: []
    });
    deletedWorkoutId = workoutToDelete._id.toString();

    // Create a session for the populated workout
    await WorkoutSession.create({
      user: userId,
      workout: populatedWorkoutId,
      status: "completed",
      exercises: []
    });

    // Create a session for the soon-to-be deleted workout
    await WorkoutSession.create({
      user: userId,
      workout: deletedWorkoutId,
      status: "completed",
      exercises: []
    });

    // DELETE the second workout
    await Workout.findByIdAndDelete(deletedWorkoutId);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("should successfully return HTTP 200 without throwing a TypeError when fetching history containing a deleted workout", async () => {
    const response = await request(app)
      .get("/api/workout-sessions?page=1&limit=20")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sessions).toBeDefined();
    
    // We created 2 sessions
    expect(response.body.data.sessions.length).toBe(2);
  });

  it("should return the correct payload structure for each session type", async () => {
    const response = await request(app)
      .get("/api/workout-sessions?page=1&limit=20")
      .set("Authorization", `Bearer ${token}`);

    const sessions = response.body.data.sessions as SafeWorkoutSession[];

    // Session 1: The populated workout
    const populatedSession = sessions.find(s => 
      typeof s.workout === 'object' && s.workout !== null && s.workout._id === populatedWorkoutId
    );
    expect(populatedSession).toBeDefined();
    expect(populatedSession?.workout).toHaveProperty("name", "Active Workout");

    // Session 2: The deleted workout
    const deletedSession = sessions.find(s => 
      typeof s.workout === 'object' && s.workout !== null && s.workout._id === "deleted"
    );
    expect(deletedSession).toBeDefined();
    expect(deletedSession?.workout).toHaveProperty("name", "Deleted Workout");
  });

  it("should preserve pagination accurately", async () => {
    const response = await request(app)
      .get("/api/workout-sessions?page=1&limit=1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sessions.length).toBe(1);
    expect(response.body.data.total).toBe(2);
  });

  it("should preserve user isolation", async () => {
    const otherUserId = new mongoose.Types.ObjectId().toString();
    const otherToken = jwt.sign({ id: otherUserId, email: "other@history.com" }, process.env.JWT_SECRET || "test-dummy-JWT_SECRET", { expiresIn: "1h" });

    const response = await request(app)
      .get("/api/workout-sessions?page=1&limit=20")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.sessions.length).toBe(0);
  });
});
