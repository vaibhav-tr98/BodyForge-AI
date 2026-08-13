import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

const getIssueField = (issue: { path?: readonly PropertyKey[] }): string => {
  if (issue.path && issue.path.length > 0) {
    return issue.path.map(String).join(".");
  }

  const issueObj = issue as unknown as { keys?: unknown[] };
  if (Array.isArray(issueObj.keys) && issueObj.keys.length > 0) {
    return issueObj.keys.map(String).join(", ");
  }

  return "request";
};

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    const errors: ValidationErrorDetail[] = err.issues.map((issue) => ({
      field: getIssueField(issue),
      message: issue.message,
    }));

    const firstMessage = err.issues[0]?.message || "Validation failed";

    logger.warn(`Validation error: ${firstMessage}`, { errors });

    res.status(400).json({
      success: false,
      message: firstMessage,
      errors,
    });
    return;
  }

  logger.error("Unexpected application error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorMiddleware;
