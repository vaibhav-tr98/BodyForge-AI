import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    res.status(401).json({ success: false, message: "Authorization token is required" });
    return;
  }

  const bearerMatch = authorizationHeader.match(/^Bearer\s+(\S+)$/);
  if (!bearerMatch) {
    res.status(401).json({ success: false, message: "Invalid authorization header" });
    return;
  }

  try {
    const decodedToken = jwt.verify(bearerMatch[1], env.jwtSecret);

    if (
      typeof decodedToken === "string" ||
      typeof decodedToken.id !== "string" ||
      !decodedToken.id
    ) {
      res.status(401).json({ success: false, message: "Invalid or expired token" });
      return;
    }

    req.authenticatedUserId = decodedToken.id;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
