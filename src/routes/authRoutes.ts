import { Router } from 'express';
import { authController } from '../controllers/authController';
import { 
  authenticate, 
  checkRole, 
  validate, 
  authRateLimit, 
  adminRateLimit 
} from '../middlewares';
import { authValidation } from '../middlewares/validationSchemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management endpoints
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         profile_id:
 *           type: string
 *           format: uuid
 *         profile_name:
 *           type: string
 *           enum: [admin, user]
 *         created_at:
 *           type: string
 *           format: date-time
 *     ApiResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [success, error]
 *         message:
 *           type: string
 *         data:
 *           type: object
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             field:
 *               type: string
 */

// Public routes
router.post(
  '/login',
  authRateLimit,
  validate(authValidation.login),
  authController.login
);

router.post(
  '/reset-password',
  authRateLimit,
  validate(authValidation.resetPassword),
  authController.resetPassword
);

// Protected routes (require authentication)
router.get(
  '/me',
  authenticate,
  authController.getMe
);

router.get(
  '/validate',
  authenticate,
  authController.validateToken
);

// Admin only routes
router.post(
  '/users',
  authenticate,
  checkRole(['admin']),
  adminRateLimit,
  validate(authValidation.createUser),
  authController.createUser
);

router.patch(
  '/users/:id/status',
  authenticate,
  checkRole(['admin']),
  adminRateLimit,
  validate(authValidation.updateUserStatus),
  authController.updateUserStatus
);

router.post(
  '/change-password',
  authenticate,
  checkRole(['admin']),
  adminRateLimit,
  validate(authValidation.changePassword),
  authController.changePassword
);

router.post(
  '/check-sync',
  authenticate,
  checkRole(['admin']),
  adminRateLimit,
  validate(authValidation.checkSync),
  authController.checkSync
);

export default router;