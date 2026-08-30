import app from "./app";
import connectDB from "./config/db";
import { env } from "./config/env";
import logger from "./utils/logger";
import { runExerciseSeed } from "./scripts/seedExercises";
import { runFoodSeed } from "./scripts/seedFoods";

import mongoose from "mongoose";

const startServer = async (): Promise<void> => {
  try {
    await connectDB(env.mongoUri);

    if (process.env.SEED_EXERCISES === "true") {
      logger.info("SEED_EXERCISES is true. Running exercise seed before starting server...");
      try {
        await runExerciseSeed();
        logger.info("Exercise seed completed successfully.");
      } catch (seedError) {
        logger.error("Failed to seed exercises during startup:", seedError);
        process.exit(1);
      }
    }

    if (process.env.SEED_FOODS === "true") {
      logger.info("SEED_FOODS is true. Running food seed before starting server...");
      try {
        await runFoodSeed();
        logger.info("Food seed completed successfully.");
      } catch (seedError) {
        logger.error("Failed to seed foods during startup:", seedError);
        process.exit(1);
      }
    }

    const server = app.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info("HTTP server closed.");
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed.");
          process.exit(0);
        } catch (err) {
          logger.error("Error closing MongoDB connection:", err);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();