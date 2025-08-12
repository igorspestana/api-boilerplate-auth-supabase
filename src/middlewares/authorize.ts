import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { logger } from '../utils/logger';

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userRole = req.user!.profile_name;

      if (!allowedRoles.includes(userRole)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user!.id,
          userRole,
          allowedRoles,
          endpoint: req.originalUrl,
          ip: req.ip,
        });

        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to access this resource',
          data: {
            code: 'INSUFFICIENT_PERMISSIONS',
            required: allowedRoles,
            current: userRole,
          },
        });
        return;
      }

      logger.info('Authorization successful', {
        userId: req.user!.id,
        userRole,
        endpoint: req.originalUrl,
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user!.id,
        endpoint: req.originalUrl,
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal authorization error',
        data: {
          code: 'AUTH_SYSTEM_ERROR',
        },
      });
      return;
    }
  };
};