import mongoose from "mongoose";

const connectDB = async (mongoUri: string): Promise<void> => {
  try {
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);

    process.exit(1);
  }
};

export default connectDB;