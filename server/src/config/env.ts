import dotenv from "dotenv";

dotenv.config();

type RequiredEnvKey = "MONGO_URI" | "JWT_SECRET" | "CLIENT_URL";

export interface AppEnv {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  clientUrl: string;
}

const parsePort = (value: string | undefined): number => {
  const portValue = value ?? "5000";
  const parsedPort = Number(portValue);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error("PORT must be a valid integer between 1 and 65535");
  }

  return parsedPort;
};

const getRequiredEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env: AppEnv = {
  port: parsePort(process.env.PORT),
  mongoUri: getRequiredEnv("MONGO_URI"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  clientUrl: getRequiredEnv("CLIENT_URL"),
};
