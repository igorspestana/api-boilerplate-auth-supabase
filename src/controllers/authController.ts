import express, { Request, Response } from 'express';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/types';
import { AuthenticatedRequest } from '../middlewares/authenticate';

export class AuthController {
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Login successful
   *                 data:
   *                   type: object
   *                   properties:
   *                     token:
   *                       type: string
   *                     user:
   *                       type: object
   *       400:
   *         description: Invalid credentials or validation error
   *       401:
   *         description: Authentication failed
   */
  async login(req: express.Request, res: express.Response): Promise<void> {
    try {
      const loginData = await authService.login(req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'Login successful',
        data: loginData,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Login controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body 
      });

      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      let statusCode = 401;
      let errorCode = 'AUTH_FAILED';

      // Map specific error messages to appropriate codes
      if (errorMessage.includes('Invalid login credentials')) {
        errorCode = 'INVALID_CREDENTIALS';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorCode = 'EMAIL_NOT_CONFIRMED';
      } else if (errorMessage.includes('User not found in system')) {
        errorCode = 'USER_NOT_FOUND';
      } else if (errorMessage.includes('User lookup failed')) {
        errorCode = 'USER_BANNED';
      }

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: errorCode,
          field: 'email',
        },
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Password reset email sent
   *       400:
   *         description: Validation error
   */
  async resetPassword(req: express.Request, res: express.Response): Promise<void> {
    try {
      await authService.resetPassword(req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'Password reset email sent',
        data: {},
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Reset password controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body 
      });

      const response: ApiResponse = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Password reset failed',
        data: {
          code: 'PASSWORD_RESET_ERROR',
        },
      };

      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user data
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User data retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getMe(req: express.Request, res: express.Response): Promise<void> {
    try {
      const user = req.user!;

      const response: ApiResponse = {
        status: 'success',
        message: 'User data retrieved successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get me controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user!.id 
      });

      const response: ApiResponse = {
        status: 'error',
        message: 'Failed to retrieve user data',
        data: {
          code: 'USER_DATA_ERROR',
        },
      };

      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/validate:
   *   get:
   *     summary: Validate JWT token
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Token is valid
   *       401:
   *         description: Invalid or expired token
   */
  async validateToken(req: express.Request, res: express.Response): Promise<void> {
    try {
      const response: ApiResponse = {
        status: 'success',
        message: 'Token valid',
        data: {
          valid: true,
          user_id: req.user!.id,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Validate token controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user!.id 
      });

      const response: ApiResponse = {
        status: 'error',
        message: 'Token validation failed',
        data: {
          code: 'TOKEN_VALIDATION_ERROR',
        },
      };

      res.status(500).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/users:
   *   post:
   *     summary: Create new user (Admin only)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - profile_id
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 2
   *                 maxLength: 100
   *               email:
   *                 type: string
   *                 format: email
   *               profile_id:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Insufficient permissions
   */
  async createUser(req: express.Request, res: express.Response): Promise<void> {
    try {
      const createdUser = await authService.createUser(req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'User created successfully',
        data: createdUser,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create user controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
        adminId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'User creation failed';
      let errorCode = 'USER_CREATION_ERROR';

      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate key')) {
        errorCode = 'USER_EXISTS';
      }

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: errorCode,
        },
      };

      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/users/{id}/status:
   *   patch:
   *     summary: Update user status (Admin only)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [active, inactive]
   *     responses:
   *       200:
   *         description: User status updated
   *       400:
   *         description: Validation error
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: User not found
   */
  async updateUserStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedUser = await authService.updateUserStatus(id, req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'User status updated',
        data: {
          id: updatedUser.id,
          status: updatedUser.status,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update user status controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        body: req.body,
        adminId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'Status update failed';
      const statusCode = errorMessage.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: 'STATUS_UPDATE_ERROR',
        },
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change user password (Admin only)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - newPassword
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Validation error
   *       403:
   *         description: Insufficient permissions
   */
  async changePassword(req: express.Request, res: express.Response): Promise<void> {
    try {
      await authService.changePassword(req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'Password changed successfully',
        data: {},
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Change password controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: { email: req.body?.email }, // Don't log password
        adminId: req.user!.id 
      });

      const response: ApiResponse = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Password change failed',
        data: {
          code: 'PASSWORD_CHANGE_ERROR',
        },
      };

      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/auth/check-sync:
   *   post:
   *     summary: Check user synchronization (Admin only)
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Sync status checked
   *       400:
   *         description: Validation error
   *       403:
   *         description: Insufficient permissions
   */
  async checkSync(req: express.Request, res: express.Response): Promise<void> {
    try {
      const syncResult = await authService.checkSync(req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'User synchronization status verified',
        data: {
          email: req.body.email,
          ...syncResult,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Check sync controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
        adminId: req.user!.id 
      });

      const response: ApiResponse = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Sync check failed',
        data: {
          code: 'SYNC_CHECK_ERROR',
        },
      };

      res.status(400).json(response);
    }
  }
}

export const authController = new AuthController();