import express, { Request, Response } from "express";
import cors from "cors";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import workoutRoutes from "./routes/workout.routes";
import exerciseRoutes from "./routes/exercise.routes";
import workoutSessionRoutes from "./routes/workoutSession.routes";
import progressionRoutes from "./routes/progression.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

// Middleware
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workout-sessions", workoutSessionRoutes);
app.use("/api/progression", progressionRoutes);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to BodyForge AI API",
  });
});

app.use(errorMiddleware);

export default app;