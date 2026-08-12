export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
