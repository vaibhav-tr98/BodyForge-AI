import app from "./app";
import connectDB from "./config/db";

type EnvConfig = {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  clientUrl: string;
};

const startServer = async (): Promise<void> => {
  try {
    const { env } = require("./config/env") as { env: EnvConfig };

    await connectDB(env.mongoUri);

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();