import { LogLevel, env } from "../config/env";

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "jwt",
  "jwtsecret",
  "authorization",
  "secret",
  "apikey",
  "cookie",
  "refreshtoken",
  "accesstoken",
  "bearer",
]);

const sanitizeValue = (key: string, value: unknown, visited: WeakSet<object>): unknown => {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) {
    return "[REDACTED]";
  }
  return sanitize(value, visited);
};

export const sanitize = (data: unknown, visited = new WeakSet<object>()): unknown => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return data
      .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, "Bearer [REDACTED]")
      .replace(/(["']?password["']?\s*:\s*["'])([^"']+)(["'])/gi, "$1[REDACTED]$3");
  }

  if (typeof data !== "object") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
  }

  if (visited.has(data)) {
    return "[Circular]";
  }
  visited.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, visited));
  }

  const sanitizedObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    sanitizedObj[k] = sanitizeValue(k, v, visited);
  }

  return sanitizedObj;
};

const formatMessage = (level: LogLevel, message: string, meta?: unknown): string => {
  const timestamp = new Date().toISOString();
  const levelTag = `[${level.toUpperCase()}]`;
  let formatted = `${timestamp} ${levelTag}: ${message}`;

  if (meta !== undefined) {
    const sanitizedMeta = sanitize(meta);
    if (typeof sanitizedMeta === "object" && sanitizedMeta !== null) {
      try {
        formatted += ` ${JSON.stringify(sanitizedMeta)}`;
      } catch {
        formatted += ` [Unserializable Meta]`;
      }
    } else {
      formatted += ` ${String(sanitizedMeta)}`;
    }
  }

  return formatted;
};

class Logger {
  private currentLogLevel(): LogLevel {
    try {
      return env.logLevel;
    } catch {
      return "info";
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const activeLevel = this.currentLogLevel();
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[activeLevel];
  }

  public debug(message: string, meta?: unknown): void {
    if (this.shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  }

  public info(message: string, meta?: unknown): void {
    if (this.shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  }

  public warn(message: string, meta?: unknown): void {
    if (this.shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  }

  public error(message: string, error?: unknown, meta?: unknown): void {
    if (this.shouldLog("error")) {
      let combinedMeta: unknown = meta;
      if (error instanceof Error) {
        combinedMeta = meta ? { error: sanitize(error), meta: sanitize(meta) } : sanitize(error);
      } else if (error !== undefined) {
        combinedMeta = meta ? { error, meta } : error;
      }
      console.error(formatMessage("error", message, combinedMeta));
    }
  }
}

export const logger = new Logger();
export default logger;
