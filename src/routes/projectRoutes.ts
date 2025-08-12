import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { 
  authenticate, 
  validate, 
  generalRateLimit 
} from '../middlewares';
import { projectValidation } from '../middlewares/validationSchemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         created_at:
 *           type: string
 *           format: date-time
 *     ProjectList:
 *       type: object
 *       properties:
 *         projects:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Project'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             pages:
 *               type: integer
 */

// All project routes require authentication
router.use(authenticate);
router.use(generalRateLimit);

router.post('/', validate(projectValidation.createProject), projectController.createProject);

router.get('/', validate(projectValidation.listProjects), projectController.listProjects);

router.get('/:id', validate(projectValidation.getProject), projectController.getProject);

router.patch('/:id', validate(projectValidation.updateProject), projectController.updateProject);

router.delete('/:id', validate(projectValidation.deleteProject), projectController.deleteProject);

export default router;