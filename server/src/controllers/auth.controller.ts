import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { MongoServerError } from "mongodb";
import { Error as MongooseError } from "mongoose";
import User from "../models/User";
import { generateToken } from "../utils/generateToken";

interface RegisterRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (
  req: Request<unknown, unknown, RegisterRequestBody>,
  res: Response
): Promise<void> => {
  const { name, email, password } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ success: false, message: "Name is required" });
    return;
  }

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    res.status(400).json({ success: false, message: "A valid email is required" });
    return;
  }

  if (typeof password !== "string" || !password) {
    res.status(400).json({ success: false, message: "Password is required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    return;
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ success: false, message: "An account with this email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });
    const token = generateToken(user._id.toString());
    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ success: false, message: "An account with this email already exists" });
      return;
    }

    if (error instanceof MongooseError.ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    if (error instanceof Error && error.message === "JWT_SECRET is not configured") {
      res.status(500).json({ success: false, message: "Server authentication configuration error" });
      return;
    }

    console.error("User registration failed:", error);
    res.status(500).json({ success: false, message: "Unable to register user" });
  }
};

export const login = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  if (typeof password !== "string" || !password) {
    res.status(400).json({ success: false, message: "Password is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    res.status(400).json({ success: false, message: "A valid email is required" });
    return;
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "JWT_SECRET is not configured") {
      res.status(500).json({ success: false, message: "Server authentication configuration error" });
      return;
    }

    console.error("User login failed:", error);
    res.status(500).json({ success: false, message: "Unable to login" });
  }
};
