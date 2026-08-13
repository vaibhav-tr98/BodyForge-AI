import mongoose from "mongoose";
import logger from "../utils/logger";

const connectDB = async (mongoUri: string): Promise<void> => {
  try {
    const conn = await mongoose.connect(mongoUri);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error("MongoDB Connection Failed:", error);

    process.exit(1);
  }
};

export default connectDB;