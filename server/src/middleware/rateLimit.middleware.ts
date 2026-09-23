import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Standardized response message
const rateLimitMessage = {
  success: false,
  message: 'Too many requests',
  code: 'ERR_RATE_LIMITED'
};

// Helper to get user ID or IP
const keyGenerator = (req: Request) => {
  return req.authenticatedUserId ? `user:${req.authenticatedUserId}` : `ip:${req.ip}`;
};

// Skip OPTIONS requests
const skip = (req: Request) => req.method === 'OPTIONS';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000, // High safety ceiling for global / fallback
  skip,
  keyGenerator,
  message: rateLimitMessage
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict protection against credential abuse
  skip,
  // Auth endpoints shouldn't have authenticatedUserId yet, but if they do it uses it. Fallback is IP.
  keyGenerator,
  message: {
    ...rateLimitMessage,
    message: 'Too many auth attempts'
  }
});

export const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Generous read limit
  skip,
  keyGenerator,
  message: rateLimitMessage
});

export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Moderate mutation limit
  skip,
  keyGenerator,
  message: rateLimitMessage
});

export const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip,
  keyGenerator,
  message: {
    ...rateLimitMessage,
    message: 'Too many analytics requests'
  }
});

export const coachingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip,
  keyGenerator,
  message: {
    ...rateLimitMessage,
    message: 'Coaching limit reached'
  }
});

export const nutritionNlpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skip,
  keyGenerator,
  message: {
    ...rateLimitMessage,
    message: 'Nutrition parsing limit reached'
  }
});

import { NextFunction, Response } from 'express';

export const apiMethodLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    return readLimiter(req, res, next);
  } else {
    return mutationLimiter(req, res, next);
  }
};
