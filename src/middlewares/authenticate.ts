import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface JWTPayload {
  id: string;
  email: string;
  profile_id: string;
  profile_name: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
      });
      
      res.status(401).json({
        status: 'error',
        message: 'Authorization token required',
        data: {
          code: 'MISSING_TOKEN',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
      }) as JWTPayload;

      // Validate required fields
      if (!decoded.id || !decoded.email || !decoded.profile_id || !decoded.profile_name) {
        logger.warn('Authentication failed: Invalid token payload', {
          tokenFields: {
            hasId: !!decoded.id,
            hasEmail: !!decoded.email,
            hasProfileId: !!decoded.profile_id,
            hasProfileName: !!decoded.profile_name,
          },
          ip: req.ip,
          endpoint: req.originalUrl,
        });
        
        res.status(401).json({
          status: 'error',
          message: 'Invalid token payload',
          data: {
            code: 'INVALID_TOKEN',
          },
        });
        return;
      }

      // Add user to request object
      (req as AuthenticatedRequest).user = decoded;

      logger.info('User authenticated successfully', {
        userId: decoded.id,
        email: decoded.email,
        profile: decoded.profile_name,
        endpoint: req.originalUrl,
      });

      next();
    } catch (jwtError) {
      let errorMessage = 'Invalid or expired token';
      let errorCode = 'INVALID_TOKEN';

      if (jwtError instanceof jwt.TokenExpiredError) {
        errorMessage = 'Token has expired';
        errorCode = 'EXPIRED_TOKEN';
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        errorMessage = 'Invalid token format';
        errorCode = 'MALFORMED_TOKEN';
      }

      logger.warn('JWT verification failed', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        ip: req.ip,
        endpoint: req.originalUrl,
      });

      res.status(401).json({
        status: 'error',
        message: errorMessage,
        data: {
          code: errorCode,
        },
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip,
      endpoint: req.originalUrl,
    });

    res.status(500).json({
      status: 'error',
      message: 'Internal authentication error',
      data: {
        code: 'AUTH_SYSTEM_ERROR',
      },
    });
    return;
  }
};