import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import User from "../models/User";
import Program from "../models/Program";
import jwt from "jsonwebtoken";

describe("Phase 8.2 Regression: Program Route Parameter Validation", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ id: userId, email: "test_val@test.com" }, process.env.JWT_SECRET || "test-dummy-JWT_SECRET", { expiresIn: "1h" });

  let programId: string;

  beforeAll(async () => {
    const mongoUri = "mongodb://127.0.0.1:27017/bodyforge_test_regression_validation";
    await mongoose.connect(mongoUri);
    await User.deleteMany({});
    await Program.deleteMany({});

    await User.create({
      _id: userId,
      email: "test_val@test.com",
      password: "Password123!",
      name: "Test User",
    });

    const program = await Program.create({
      name: "Test Program",
      user: userId,
      weeks: [{
        days: Array.from({ length: 7 }).map((_, i) => ({
          dayIndex: i,
          workoutId: new mongoose.Types.ObjectId()
        }))
      }],
      startDate: new Date().toISOString().split("T")[0],
      timezone: "UTC",
      status: "active"
    });
    programId = program._id.toString();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("GET /api/programs/:id", () => {
    it("should return 400 for invalid ObjectId", async () => {
      const response = await request(app)
        .get("/api/programs/not-an-object-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid program ID");
    });

    it("should return 200 for valid ObjectId", async () => {
      const response = await request(app)
        .get(`/api/programs/${programId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PATCH /api/programs/:id", () => {
    it("should return 400 for invalid ObjectId", async () => {
      const response = await request(app)
        .patch("/api/programs/not-an-object-id")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "New Name" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid program ID");
    });
  });

  describe("DELETE /api/programs/:id", () => {
    it("should return 400 for invalid ObjectId", async () => {
      const response = await request(app)
        .delete("/api/programs/not-an-object-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid program ID");
    });
  });

  describe("GET /api/programs/active/today", () => {
    it("should not treat 'active/today' as an invalid ID", async () => {
      const response = await request(app)
        .get("/api/programs/active/today")
        .set("Authorization", `Bearer ${token}`);

      // Expecting a 200 assuming the test setup made this program active for today.
      // But mainly checking it's not 400 validation error.
      expect(response.status).not.toBe(400);
      expect(response.status).toBe(200);
    });
  });
});
