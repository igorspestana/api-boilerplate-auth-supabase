import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ListProjectsQuery,
  PaginationResponse,
} from '../utils/types';

export class ProjectService {
  /**
   * Create a new project for a user
   */
  async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const { name } = projectData;

    try {
      logger.info('Creating project', { userId, name });

      // Check if user already has a project with the same name
      const { data: existingProject, error: checkError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Failed to check existing project:', { error: checkError.message, userId, name });
        throw new Error('Failed to validate project name');
      }

      if (existingProject) {
        logger.warn('Project name already exists for user:', { userId, name });
        throw new Error('A project with this name already exists');
      }

      // Create the project
      const { data: project, error: createError } = await supabaseAdmin
        .from('projects')
        .insert({
          user_id: userId,
          name,
          status: 'pending', // Always starts as pending
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create project:', { error: createError.message, userId, name });
        throw new Error(createError.message);
      }

      if (!project) {
        logger.error('No project data returned after creation:', { userId, name });
        throw new Error('Failed to create project');
      }

      logger.info('Project created successfully:', { projectId: project.id, userId, name });
      return project;

    } catch (error) {
      logger.error('Project creation failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        name 
      });
      throw error;
    }
  }

  /**
   * Get projects for a user with optional filtering and pagination
   */
  async getProjects(userId: string, query: ListProjectsQuery): Promise<PaginationResponse<Project>> {
    const { status, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    try {
      logger.info('Fetching projects', { userId, status, page, limit });

      // Build query
      let projectQuery = supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Add status filter if provided
      if (status) {
        projectQuery = projectQuery.eq('status', status);
      }

      // Add pagination
      projectQuery = projectQuery.range(offset, offset + limit - 1);

      const { data: projects, error, count } = await projectQuery;

      if (error) {
        logger.error('Failed to fetch projects:', { error: error.message, userId });
        throw new Error(error.message);
      }

      const total = count || 0;
      const pages = Math.ceil(total / limit);

      logger.info('Projects fetched successfully:', { 
        userId, 
        count: projects?.length || 0, 
        total, 
        page, 
        pages 
      });

      return {
        items: projects || [],
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };

    } catch (error) {
      logger.error('Failed to fetch projects:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get a specific project by ID (with ownership validation)
   */
  async getProjectById(userId: string, projectId: string): Promise<Project> {
    try {
      logger.info('Fetching project by ID', { userId, projectId });

      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId) // Ensure ownership
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          logger.warn('Project not found or access denied:', { userId, projectId });
          throw new Error('Project not found');
        }
        logger.error('Failed to fetch project:', { error: error.message, userId, projectId });
        throw new Error(error.message);
      }

      if (!project) {
        logger.warn('Project not found:', { userId, projectId });
        throw new Error('Project not found');
      }

      logger.info('Project fetched successfully:', { userId, projectId });
      return project;

    } catch (error) {
      logger.error('Failed to fetch project by ID:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        projectId 
      });
      throw error;
    }
  }

  /**
   * Update a project (with ownership validation)
   */
  async updateProject(userId: string, projectId: string, updateData: UpdateProjectRequest): Promise<Project> {
    const { name, status } = updateData;

    try {
      logger.info('Updating project', { userId, projectId, updateData });

      // First check if project exists and user owns it
      const existingProject = await this.getProjectById(userId, projectId);

      // If changing name, check for duplicates
      if (name && name !== existingProject.name) {
        const { data: duplicateProject, error: checkError } = await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('user_id', userId)
          .eq('name', name)
          .neq('id', projectId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          logger.error('Failed to check duplicate project name:', { error: checkError.message, userId, name });
          throw new Error('Failed to validate project name');
        }

        if (duplicateProject) {
          logger.warn('Project name already exists for user:', { userId, name });
          throw new Error('A project with this name already exists');
        }
      }

      // Validate status transition if status is being changed
      if (status && status !== existingProject.status) {
        const isValidTransition = this.isValidStatusTransition(existingProject.status, status);
        if (!isValidTransition) {
          logger.warn('Invalid status transition:', { 
            userId, 
            projectId, 
            fromStatus: existingProject.status, 
            toStatus: status 
          });
          throw new Error(`Cannot change status from ${existingProject.status} to ${status}`);
        }
      }

      // Update the project
      const updateObject: Partial<Project> = {};
      if (name !== undefined) updateObject.name = name;
      if (status !== undefined) updateObject.status = status;

      const { data: updatedProject, error: updateError } = await supabaseAdmin
        .from('projects')
        .update(updateObject)
        .eq('id', projectId)
        .eq('user_id', userId) // Ensure ownership
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update project:', { error: updateError.message, userId, projectId });
        throw new Error(updateError.message);
      }

      if (!updatedProject) {
        logger.error('No project data returned after update:', { userId, projectId });
        throw new Error('Failed to update project');
      }

      logger.info('Project updated successfully:', { userId, projectId, updateData });
      return updatedProject;

    } catch (error) {
      logger.error('Project update failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        projectId 
      });
      throw error;
    }
  }

  /**
   * Delete a project (with ownership validation)
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    try {
      logger.info('Deleting project', { userId, projectId });

      // First check if project exists and user owns it
      await this.getProjectById(userId, projectId);

      // Delete the project
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId); // Ensure ownership

      if (deleteError) {
        logger.error('Failed to delete project:', { error: deleteError.message, userId, projectId });
        throw new Error(deleteError.message);
      }

      logger.info('Project deleted successfully:', { userId, projectId });

    } catch (error) {
      logger.error('Project deletion failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        projectId 
      });
      throw error;
    }
  }

  /**
   * Validate status transition according to business rules
   */
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['active', 'cancelled'],
      'active': ['completed', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

export const projectService = new ProjectService();