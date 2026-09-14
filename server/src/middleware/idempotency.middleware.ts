import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { hashContext } from "../utils/hashContext";
import IdempotencyRecord from "../models/IdempotencyRecord";
import logger from "../utils/logger";

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.header("Idempotency-Key");
  if (!idempotencyKey) {
    next();
    return;
  }

  if (!req.body || !req.body.expectedUpdatedAt) {
    next(new AppError("expectedUpdatedAt is required when using Idempotency-Key", 400, true, "EXPECTED_UPDATED_AT_REQUIRED"));
    return;
  }

  const userId = req.authenticatedUserId;
  if (!userId) {
    next(new AppError("Authentication required", 401));
    return;
  }

  const requestHash = hashContext({
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });

  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 30000); // 30 seconds
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await IdempotencyRecord.create({
      user: userId,
      key: idempotencyKey,
      requestHash,
      status: "in_progress",
      lockedUntil,
      expiresAt
    });
  } catch (error: any) {
    if (error.code === 11000) {
      try {
        const record = await IdempotencyRecord.findOne({ user: userId, key: idempotencyKey });
        if (!record) {
          next(new AppError("Idempotency conflict but record not found", 500));
          return;
        }

        if (record.status === "completed") {
          if (record.requestHash !== requestHash) {
            next(new AppError("Idempotency key reused for a different request", 409, true, "IDEMPOTENCY_KEY_REUSE"));
            return;
          }
          if (record.response) {
            res.status(record.response.statusCode).json(record.response.body);
            return;
          } else {
             next(new AppError("Stored response is missing", 500));
             return;
          }
        }

        if (record.status === "in_progress") {
          if (record.lockedUntil && record.lockedUntil > new Date()) {
            next(new AppError("Idempotency request currently in progress", 409, true, "IDEMPOTENCY_REQUEST_IN_PROGRESS"));
            return;
          } else {
            // Stale lease
            const lock = await IdempotencyRecord.findOneAndUpdate(
              { _id: record._id, status: "in_progress", lockedUntil: record.lockedUntil },
              { $set: { lockedUntil, requestHash } },
              { new: true }
            );
            if (!lock) {
              next(new AppError("Idempotency request currently in progress", 409, true, "IDEMPOTENCY_REQUEST_IN_PROGRESS"));
              return;
            }
          }
        }
      } catch (err) {
        next(err);
        return;
      }
    } else {
      next(error);
      return;
    }
  }

  // Intercept res.json
  const originalJson = res.json.bind(res);
  res.json = function (body: any): Response {
    res.json = originalJson; // restore immediately

    const statusCode = res.statusCode;
    
    IdempotencyRecord.updateOne(
      { user: userId, key: idempotencyKey },
      { $set: { status: "completed", response: { statusCode, body }, lockedUntil: null } }
    ).catch(err => logger.error("Failed to update idempotency record", err));

    return originalJson(body);
  };

  next();
};
