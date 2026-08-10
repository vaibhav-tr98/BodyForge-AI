import jwt from "jsonwebtoken";

export const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: "7d",
  });
};
