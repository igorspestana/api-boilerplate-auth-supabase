import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

// Base rate limit configuration
const createRateLimit = (
  windowMs: number,
  max: number,
  message: string,
  keyGenerator?: (req: Request) => string
) => {
  return rateLimit({
    windowMs: windowMs * 60 * 1000, // Convert minutes to milliseconds
    max,
    keyGenerator: keyGenerator || ((req: Request) => req.ip || 'unknown'),
    skip: (req: Request) => {
      // Skip rate limiting in test environment
      return config.nodeEnv === 'test';
    },
    handler: (req: Request, res: Response) => {
      const userAgent = req.get('User-Agent') || 'Unknown';
      const endpoint = req.originalUrl;
      
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent,
        endpoint,
        limit: max,
        window: windowMs,
        timestamp: new Date().toISOString(),
      });

      res.status(429).json({
        status: 'error',
        message,
        data: {
          retryAfter: Math.ceil(windowMs * 60),
          limit: max,
          window: windowMs,
          code: 'RATE_LIMIT_EXCEEDED',
        },
      });
    },
    // Headers to include in response
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Authentication endpoints rate limiting (stricter)
export const authRateLimit = createRateLimit(
  config.rateLimit.window,
  config.rateLimit.auth,
  'Too many authentication attempts, please try again later'
);

// General API endpoints rate limiting
export const generalRateLimit = createRateLimit(
  config.rateLimit.window,
  config.rateLimit.general,
  'Too many requests, please try again later',
  (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  }
);

// Health check rate limiting (more permissive)
export const healthRateLimit = createRateLimit(
  config.rateLimit.window,
  config.rateLimit.health,
  'Too many health check requests, please try again later'
);

// Admin endpoints rate limiting (moderate)
export const adminRateLimit = createRateLimit(
  config.rateLimit.window,
  Math.floor(config.rateLimit.general / 2), // Half of general limit
  'Too many admin requests, please try again later',
  (req: Request) => {
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  }
);