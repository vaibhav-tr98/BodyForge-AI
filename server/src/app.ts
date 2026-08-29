import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import workoutRoutes from "./routes/workout.routes";
import exerciseRoutes from "./routes/exercise.routes";
import workoutSessionRoutes from "./routes/workoutSession.routes";
import progressionRoutes from "./routes/progression.routes";
import analyticsRoutes from "./routes/analytics.routes";
import nutritionRoutes from "./routes/nutrition.routes";
import progressRoutes from "./routes/progress.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import mongoose from "mongoose";
const app = express();

// Security headers
app.use(helmet());

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://body-forge-ai-eight.vercel.app"
];

if (env.clientUrl) {
  allowedOrigins.push(env.clientUrl.replace(/\/$/, ""));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / tools without origin
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Also allow any localhost port in development just in case
    if (env.nodeEnv !== "production" && /^https?:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));

// Apply general rate limit to all /api routes
app.use("/api", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-sessions", workoutSessionRoutes);
app.use("/api/progression", progressionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/progress", progressRoutes);

// Health Check Route
app.get("/ready", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ success: true, status: "ready" });
  } else {
    res.status(503).json({ success: false, status: "unavailable" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to BodyForge AI API",
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use(errorMiddleware);

export default app;
