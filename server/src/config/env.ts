import dotenv from "dotenv";

dotenv.config();

type RequiredEnvKey = "MONGO_URI" | "JWT_SECRET" | "CLIENT_URL" | "GEMINI_API_KEY";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type NodeEnv = "development" | "production" | "test";

export interface AppEnv {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  clientUrl: string;
  logLevel: LogLevel;
  geminiApiKey: string;
  aiModel: string;
  nodeEnv: NodeEnv;
}

const getRequiredEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];

  if (!value || !value.trim()) {
    if (process.env.NODE_ENV === "test") {
      return `test-dummy-${key}`;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const getOptionalEnv = (key: string, defaultValue: string): string => {
  const value = process.env[key];
  if (!value || !value.trim()) {
    return defaultValue;
  }
  return value.trim();
};

const parsePort = (value: string | undefined): number => {
  if (!value || !value.trim()) {
    return 5000;
  }

  const parsed = Number(value.trim());

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be a valid integer between 1 and 65535");
  }

  return parsed;
};

const parseLogLevel = (value: string | undefined): LogLevel => {
  if (!value) {
    return "info";
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "debug" ||
    normalized === "info" ||
    normalized === "warn" ||
    normalized === "error"
  ) {
    return normalized;
  }

  return "info";
};

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  if (!value) return "development";
  const normalized = value.trim().toLowerCase();
  if (normalized === "production" || normalized === "test" || normalized === "development") {
    return normalized as NodeEnv;
  }
  return "development";
};

export const env: AppEnv = {
  port: parsePort(process.env.PORT),
  mongoUri: getRequiredEnv("MONGO_URI"),
  jwtSecret: getRequiredEnv("JWT_SECRET"),
  clientUrl: getRequiredEnv("CLIENT_URL"),
  logLevel: parseLogLevel(process.env.LOG_LEVEL),
  geminiApiKey: getRequiredEnv("GEMINI_API_KEY"),
  aiModel: getOptionalEnv("AI_MODEL", "gemini-2.5-flash"),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
};
