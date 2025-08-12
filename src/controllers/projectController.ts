import express from 'express';
import { projectService } from '../services/projectService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/types';
import { AuthenticatedRequest } from '../middlewares/authenticate';

export class ProjectController {
  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
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
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *     responses:
   *       201:
   *         description: Project created successfully
   *       400:
   *         description: Validation error or duplicate name
   *       401:
   *         description: Unauthorized
   */
  async createProject(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const project = await projectService.createProject(userId, req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'Project created successfully',
        data: project,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Create project controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
        userId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'Project creation failed';
      let errorCode = 'PROJECT_CREATION_ERROR';

      if (errorMessage.includes('already exists')) {
        errorCode = 'DUPLICATE_PROJECT_NAME';
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
   * /api/projects:
   *   get:
   *     summary: List user projects
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, active, completed, cancelled]
   *         description: Filter by project status
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Items per page
   *     responses:
   *       200:
   *         description: Projects retrieved successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  async listProjects(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const projects = await projectService.getProjects(userId, req.query);

      const response: ApiResponse = {
        status: 'success',
        message: 'Projects retrieved successfully',
        data: {
          projects: projects.items,
          pagination: projects.pagination,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('List projects controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
        userId: req.user!.id 
      });

      const response: ApiResponse = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to retrieve projects',
        data: {
          code: 'PROJECT_LIST_ERROR',
        },
      };

      res.status(400).json(response);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   get:
   *     summary: Get project details
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Project details retrieved
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Project not found
   */
  async getProject(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const project = await projectService.getProjectById(userId, id);

      const response: ApiResponse = {
        status: 'success',
        message: 'Project details retrieved',
        data: project,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Get project controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        userId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve project';
      const statusCode = errorMessage.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: 'PROJECT_RETRIEVAL_ERROR',
        },
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   patch:
   *     summary: Update project
   *     tags: [Projects]
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
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 100
   *               status:
   *                 type: string
   *                 enum: [pending, active, completed, cancelled]
   *     responses:
   *       200:
   *         description: Project updated successfully
   *       400:
   *         description: Validation error or invalid status transition
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Project not found
   */
  async updateProject(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updatedProject = await projectService.updateProject(userId, id, req.body);

      const response: ApiResponse = {
        status: 'success',
        message: 'Project updated successfully',
        data: {
          id: updatedProject.id,
          name: updatedProject.name,
          status: updatedProject.status,
          updated_at: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Update project controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        body: req.body,
        userId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'Project update failed';
      let statusCode = 400;
      let errorCode = 'PROJECT_UPDATE_ERROR';

      if (errorMessage.includes('not found')) {
        statusCode = 404;
        errorCode = 'PROJECT_NOT_FOUND';
      } else if (errorMessage.includes('already exists')) {
        errorCode = 'DUPLICATE_PROJECT_NAME';
      } else if (errorMessage.includes('Cannot change status')) {
        errorCode = 'INVALID_STATUS_TRANSITION';
      }

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: errorCode,
        },
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   delete:
   *     summary: Delete project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Project deleted successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Project not found
   */
  async deleteProject(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await projectService.deleteProject(userId, id);

      const response: ApiResponse = {
        status: 'success',
        message: 'Project deleted successfully',
        data: {},
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Delete project controller error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        userId: req.user!.id 
      });

      const errorMessage = error instanceof Error ? error.message : 'Project deletion failed';
      const statusCode = errorMessage.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        status: 'error',
        message: errorMessage,
        data: {
          code: 'PROJECT_DELETION_ERROR',
        },
      };

      res.status(statusCode).json(response);
    }
  }
}

export const projectController = new ProjectController();