import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, message: 'Too many requests' } });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many auth attempts' } });
export const analyticsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many analytics requests' } });
export const coachingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { success: false, message: 'Coaching limit reached' } });
export const nutritionNlpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyGenerator: (req: any) => req.user ? req.user._id.toString() : req.ip, message: { success: false, message: 'Nutrition parsing limit reached' } });
