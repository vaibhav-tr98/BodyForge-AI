import request from "supertest";
import app from "../../src/app";
import { programService } from "../../src/services/program.service";
import { AppError } from "../../src/errors/AppError";
import jwt from "jsonwebtoken";
import { Error as MongooseError } from "mongoose";
import { env } from "../../src/config/env";

jest.mock("../../src/services/program.service");

describe("Program Controller Error Handling", () => {
  const mockToken = jwt.sign({ id: "6aad08ef6d343d0925465f0b" }, env.jwtSecret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Valid Save as Draft succeeds (201)", async () => {
    (programService.createProgram as jest.Mock).mockResolvedValue({ id: "123", name: "Valid" });
    
    const response = await request(app)
      .post("/api/programs")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ name: "Valid" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("Mongoose ValidationError does not become generic 500 but returns 400 with details", async () => {
    const validationError = new MongooseError.ValidationError();
    validationError.errors = {
      startDate: {
        path: "startDate",
        message: "Start date must be in YYYY-MM-DD format",
      } as any,
    };

    (programService.createProgram as jest.Mock).mockRejectedValue(validationError);

    const response = await request(app)
      .post("/api/programs")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ startDate: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Start date must be in YYYY-MM-DD format");
  });

  it("Mongoose CastError does not become generic 500 but returns 400", async () => {
    const castError = new MongooseError.CastError("ObjectId", "invalid-id", "workoutId");
    
    (programService.createProgram as jest.Mock).mockRejectedValue(castError);

    const response = await request(app)
      .post("/api/programs")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({ weeks: [{ days: [{ workoutId: "invalid-id" }] }] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid resource identifier");
  });

  it("AppError behavior remains unchanged (400)", async () => {
    (programService.createProgram as jest.Mock).mockRejectedValue(new AppError("You already have an active program", 400));

    const response = await request(app)
      .post("/api/programs")
      .set("Authorization", `Bearer ${mockToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("You already have an active program");
  });
});