import { ErrorRequestHandler } from "express";
import { AppError } from "../errors/AppError";

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

  console.error("Unexpected application error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorMiddleware;
