import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: string[] = [];

      // Validate request body
      if (schemas.body) {
        try {
          req.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            const bodyErrors = error.errors.map(err => `body.${err.path.join('.')}: ${err.message}`);
            errors.push(...bodyErrors);
          }
        }
      }

      // Validate request params
      if (schemas.params) {
        try {
          req.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            const paramErrors = error.errors.map(err => `params.${err.path.join('.')}: ${err.message}`);
            errors.push(...paramErrors);
          }
        }
      }

      // Validate query parameters
      if (schemas.query) {
        try {
          req.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            const queryErrors = error.errors.map(err => `query.${err.path.join('.')}: ${err.message}`);
            errors.push(...queryErrors);
          }
        }
      }

      if (errors.length > 0) {
        logger.warn('Validation failed', {
          errors,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          body: req.body,
          params: req.params,
          query: req.query,
        });

        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          data: {
            code: 'VALIDATION_ERROR',
            errors,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: req.originalUrl,
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal validation error',
        data: {
          code: 'VALIDATION_SYSTEM_ERROR',
        },
      });
      return;
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  status: z.enum(['active', 'inactive'], { 
    errorMap: () => ({ message: 'Status must be either active or inactive' })
  }),
  projectStatus: z.enum(['pending', 'active', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Project status must be pending, active, completed, or cancelled' })
  }),
  pagination: {
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1).refine((val) => val > 0, 'Page must be greater than 0'),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10).refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  },
};