import { Request, Response, NextFunction } from "express";
import { idempotencyMiddleware } from "../idempotency.middleware";
import IdempotencyRecord from "../../models/IdempotencyRecord";
import { AppError } from "../../errors/AppError";

jest.mock("../../models/IdempotencyRecord");
jest.mock("../../utils/logger", () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe("idempotencyMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      method: "POST",
      originalUrl: "/api/test",
      body: {},
      authenticatedUserId: "user123"
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    res.statusCode = 200;
    next = jest.fn();
    (IdempotencyRecord.updateOne as jest.Mock).mockResolvedValue({});
    jest.clearAllMocks();
  });

  it("should pass through if no Idempotency-Key", async () => {
    (req.header as jest.Mock).mockReturnValue(undefined);
    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(IdempotencyRecord.create).not.toHaveBeenCalled();
  });

  it("should require expectedUpdatedAt if Idempotency-Key is present", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = {};
    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.code).toBe("EXPECTED_UPDATED_AT_REQUIRED");
  });

  it("should acquire lock and intercept res.json on first request", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = { expectedUpdatedAt: "2026-09-01T00:00:00.000Z" };
    (IdempotencyRecord.create as jest.Mock).mockResolvedValue({});
    
    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();

    // simulate controller calling res.json
    const originalJson = res.json;
    if (originalJson) {
      originalJson({ success: true });
    }
    expect(IdempotencyRecord.updateOne).toHaveBeenCalled();
  });

  it("should return stored response on exact key reuse", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = { expectedUpdatedAt: "2026-09-01T00:00:00.000Z" };
    
    const duplicateError: any = new Error("E11000");
    duplicateError.code = 11000;
    (IdempotencyRecord.create as jest.Mock).mockRejectedValue(duplicateError);

    (IdempotencyRecord.findOne as jest.Mock).mockResolvedValue({
      status: "completed",
      requestHash: expect.any(String),
      response: { statusCode: 200, body: { data: "cached" } }
    });

    // Mock hash to match what will be generated
    // Actually the mock matcher in findOne will just return the object.
    // Let's just set the requestHash manually so it matches the generated one.
    const { hashContext } = require("../../utils/hashContext");
    const hash = hashContext({ method: req.method, url: req.originalUrl, body: req.body });
    
    (IdempotencyRecord.findOne as jest.Mock).mockResolvedValue({
      status: "completed",
      requestHash: hash,
      response: { statusCode: 200, body: { data: "cached" } }
    });

    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: "cached" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 409 IDEMPOTENCY_KEY_REUSE on different body", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = { expectedUpdatedAt: "2026-09-01T00:00:00.000Z" };
    
    const duplicateError: any = new Error("E11000");
    duplicateError.code = 11000;
    (IdempotencyRecord.create as jest.Mock).mockRejectedValue(duplicateError);

    (IdempotencyRecord.findOne as jest.Mock).mockResolvedValue({
      status: "completed",
      requestHash: "different-hash",
      response: { statusCode: 200, body: { data: "cached" } }
    });

    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.code).toBe("IDEMPOTENCY_KEY_REUSE");
    expect(err.statusCode).toBe(409);
  });

  it("should return 409 IDEMPOTENCY_REQUEST_IN_PROGRESS on fresh duplicate", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = { expectedUpdatedAt: "2026-09-01T00:00:00.000Z" };
    
    const duplicateError: any = new Error("E11000");
    duplicateError.code = 11000;
    (IdempotencyRecord.create as jest.Mock).mockRejectedValue(duplicateError);

    const futureDate = new Date(Date.now() + 10000); // 10 seconds in future
    (IdempotencyRecord.findOne as jest.Mock).mockResolvedValue({
      _id: "record-123",
      status: "in_progress",
      lockedUntil: futureDate
    });

    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.code).toBe("IDEMPOTENCY_REQUEST_IN_PROGRESS");
    expect(err.statusCode).toBe(409);
  });

  it("should acquire stale lease atomically", async () => {
    (req.header as jest.Mock).mockReturnValue("key-123");
    req.body = { expectedUpdatedAt: "2026-09-01T00:00:00.000Z" };
    
    const duplicateError: any = new Error("E11000");
    duplicateError.code = 11000;
    (IdempotencyRecord.create as jest.Mock).mockRejectedValue(duplicateError);

    const pastDate = new Date(Date.now() - 10000); // 10 seconds in past
    (IdempotencyRecord.findOne as jest.Mock).mockResolvedValue({
      _id: "record-123",
      status: "in_progress",
      lockedUntil: pastDate
    });

    (IdempotencyRecord.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: "record-123",
      status: "in_progress"
    });

    await idempotencyMiddleware(req as Request, res as Response, next);
    expect(IdempotencyRecord.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "record-123", lockedUntil: pastDate }),
      expect.objectContaining({ $set: expect.anything() }),
      { new: true }
    );
    expect(next).toHaveBeenCalledWith(); // acquired successfully and proceeded
  });
});
