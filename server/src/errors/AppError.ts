export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code?: string;

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
