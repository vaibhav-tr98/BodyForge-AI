import app from "./app";
import connectDB from "./config/db";
import { env } from "./config/env";
import logger from "./utils/logger";

const startServer = async (): Promise<void> => {
  try {
    await connectDB(env.mongoUri);

    app.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();