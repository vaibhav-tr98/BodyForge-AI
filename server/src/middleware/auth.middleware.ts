import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ success: false, message: "Server authentication configuration error" });
    return;
  }

  try {
    const decodedToken = jwt.verify(bearerMatch[1], jwtSecret);

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
