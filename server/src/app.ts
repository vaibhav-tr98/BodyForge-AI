import express, { Request, Response } from "express";
import cors from "cors";
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
const app = express();

// Middleware
const cleanClientUrl = env.clientUrl.replace(/\/$/, ""); // Remove trailing slash

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / tools without origin
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow configured client url (ignoring trailing slash)
    if (origin === cleanClientUrl || origin + "/" === cleanClientUrl || cleanClientUrl + "/" === origin) {
      return callback(null, true);
    }
    
    // Allow localhost in development
    if (env.nodeEnv !== "production" && /^https?:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

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
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use(errorMiddleware);

export default app;