import { Request, Response, NextFunction } from "express";
import { errorMiddleware } from "./error.middleware";
import { MongoServerError } from "mongodb";
import { Error as MongooseError } from "mongoose";
import { AppError } from "../errors/AppError";
import { ZodError, ZodIssue } from "zod";

jest.mock("../utils/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("Error Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    };
  });

  it("handles MongoServerError code 11000 and returns 409", () => {
    const error = new MongoServerError({ message: "E11000 duplicate key error" });
    error.code = 11000;

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Resource already exists",
    });
  });

  it("handles Mongoose CastError and returns 400", () => {
    const error = new MongooseError.CastError("ObjectId", "invalid_id", "path");

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid resource identifier",
    });
  });

  it("leaves AppError behavior unchanged", () => {
    const error = new AppError("Custom error", 403);

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Custom error",
    });
  });

  it("leaves ZodError behavior unchanged", () => {
    const issues: ZodIssue[] = [
      {
        code: "custom",
        path: ["field"],
        message: "Invalid field",
      },
    ];
    const error = new ZodError(issues);

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid field",
      errors: [{ field: "field", message: "Invalid field" }],
    });
  });

  it("leaves unknown error as 500 and does not expose stack trace", () => {
    const error = new Error("Super secret database failure at line 42");

    errorMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});
