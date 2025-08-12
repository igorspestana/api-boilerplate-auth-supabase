import { z } from 'zod';
import { commonSchemas } from './validation';

// Auth validation schemas
export const authValidation = {
  login: {
    body: z.object({
      email: commonSchemas.email,
      password: z.string().min(1, 'Password is required'),
    }),
  },

  resetPassword: {
    body: z.object({
      email: commonSchemas.email,
    }),
  },

  createUser: {
    body: z.object({
      name: commonSchemas.name,
      email: commonSchemas.email,
      profile_id: commonSchemas.uuid,
    }),
  },

  updateUserStatus: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
    body: z.object({
      status: commonSchemas.status,
    }),
  },

  changePassword: {
    body: z.object({
      email: commonSchemas.email,
      newPassword: commonSchemas.password,
    }),
  },

  checkSync: {
    body: z.object({
      email: commonSchemas.email,
    }),
  },
};

// Project validation schemas
export const projectValidation = {
  createProject: {
    body: z.object({
      name: z.string()
        .min(3, 'Project name must be at least 3 characters')
        .max(100, 'Project name cannot exceed 100 characters')
        .trim()
        .refine((name) => name.length > 0, 'Project name cannot be empty'),
    }),
  },

  listProjects: {
    query: z.object({
      status: commonSchemas.projectStatus.optional(),
      page: commonSchemas.pagination.page,
      limit: commonSchemas.pagination.limit,
    }),
  },

  getProject: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
  },

  updateProject: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
    body: z.object({
      name: z.string()
        .min(3, 'Project name must be at least 3 characters')
        .max(100, 'Project name cannot exceed 100 characters')
        .trim()
        .refine((name) => name.length > 0, 'Project name cannot be empty')
        .optional(),
      status: commonSchemas.projectStatus.optional(),
    }).refine(
      (data) => data.name !== undefined || data.status !== undefined,
      'At least one field (name or status) must be provided'
    ),
  },

  deleteProject: {
    params: z.object({
      id: commonSchemas.uuid,
    }),
  },
};