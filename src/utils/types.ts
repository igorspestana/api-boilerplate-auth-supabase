// Common API response format
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  profile_id: string;
  created_at: string;
}

export interface UserWithProfile extends User {
  profile_name: string;
}

// Profile types
export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

// Project types
export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserWithProfile;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  profile_id: string;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive';
}

export interface ChangePasswordRequest {
  email: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface CheckSyncRequest {
  email: string;
}

// Project types
export interface CreateProjectRequest {
  name: string;
}

export interface UpdateProjectRequest {
  name?: string;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface ListProjectsQuery {
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  page?: number;
  limit?: number;
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error types
export interface ErrorResponse {
  code: string;
  field?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}