import jwt from 'jsonwebtoken';
import { supabaseAdmin, supabasePublic } from '../config/supabase';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  User,
  UserWithProfile,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UpdateUserStatusRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  CheckSyncRequest,
} from '../utils/types';

export class AuthService {
  /**
   * Authenticate user with email and password using Supabase Auth
   * Then generate custom JWT with profile data
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { email, password } = credentials;

    try {
      logger.info('Login attempt', { email });

      // Step 1: Validate credentials with Supabase Auth
      const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        logger.error('Supabase Auth error:', { error: authError.message, email });
        throw new Error(authError.message);
      }

      if (!authData.user) {
        logger.error('No user data returned from Supabase Auth', { email });
        throw new Error('Authentication failed');
      }

      // Step 2: Get user data from our system
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          name,
          email,
          status,
          profile_id,
          created_at,
          profiles(name)
        `)
        .eq('email', email)
        .single();

      if (userError) {
        logger.error('Failed to fetch user data:', { error: userError.message, email });
        throw new Error('User not found in system. Please contact administrator.');
      }

      if (!userData) {
        logger.error('User not found in system:', { email });
        throw new Error('User not found in system. Please contact administrator.');
      }

      if (userData.status !== 'active') {
        logger.warn('Inactive user login attempt:', { email, status: userData.status });
        throw new Error('User lookup failed');
      }

      // Step 3: Sign out from Supabase Auth (we only use it for validation)
      await supabasePublic.auth.signOut();

      // Step 4: Generate custom JWT
      const userWithProfile: UserWithProfile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        status: userData.status,
        profile_id: userData.profile_id,
        profile_name: (userData.profiles as any)?.name || 'user',
        created_at: userData.created_at,
      };

      const payload = {
        id: userWithProfile.id,
        email: userWithProfile.email,
        profile_id: userWithProfile.profile_id,
        profile_name: userWithProfile.profile_name,
      };

      const token = (jwt as any).sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
      });

      logger.info('Login successful', { 
        userId: userWithProfile.id, 
        email: userWithProfile.email, 
        profile: userWithProfile.profile_name 
      });

      return {
        token,
        user: userWithProfile,
      };
    } catch (error) {
      logger.error('Login failed:', { error: error instanceof Error ? error.message : 'Unknown error', email });
      throw error;
    }
  }

  /**
   * Create a new user in both Supabase Auth and our system
   * Send password reset email for user to set their own password
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const { name, email, profile_id } = userData;
    const tempPassword = this.generateTempPassword();

    try {
      logger.info('Creating user', { email, profile_id });

      // Step 1: Create user in Supabase Auth with temporary password
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        logger.error('Failed to create user in Supabase Auth:', { error: authError.message, email });
        throw new Error(authError.message);
      }

      if (!authData.user) {
        logger.error('No user data returned from Supabase Auth creation', { email });
        throw new Error('Failed to create user in authentication system');
      }

      let createdUser: User;

      try {
        // Step 2: Create user in our system
        const { data: systemUser, error: systemError } = await supabaseAdmin
          .from('users')
          .insert({
            name,
            email,
            profile_id,
            status: 'active',
          })
          .select()
          .single();

        if (systemError) {
          logger.error('Failed to create user in system:', { error: systemError.message, email });
          throw new Error(systemError.message);
        }

        createdUser = systemUser;
        logger.info('User created in system:', { userId: createdUser.id, email });

      } catch (systemErr) {
        // Cleanup: Remove user from Supabase Auth if system creation failed
        logger.warn('Cleaning up Supabase Auth user due to system creation failure', { email });
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw systemErr;
      }

      try {
        // Step 3: Send password reset email
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
        });

        if (resetError) {
          logger.warn('Failed to send password reset email:', { error: resetError.message, email });
          // Don't throw error - user is created successfully
        } else {
          logger.info('Password reset email sent:', { email });
        }
      } catch (emailErr) {
        logger.warn('Error sending password reset email:', { 
          error: emailErr instanceof Error ? emailErr.message : 'Unknown error', 
          email 
        });
      }

      logger.info('User created successfully:', { userId: createdUser.id, email });
      return createdUser;

    } catch (error) {
      logger.error('User creation failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email 
      });
      throw error;
    }
  }

  /**
   * Update user status and sync with Supabase Auth
   */
  async updateUserStatus(userId: string, statusData: UpdateUserStatusRequest): Promise<User> {
    const { status } = statusData;

    try {
      logger.info('Updating user status', { userId, status });

      // Step 1: Update status in our system
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ status })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update user status:', { error: updateError.message, userId });
        throw new Error(updateError.message);
      }

      if (!updatedUser) {
        logger.error('User not found for status update:', { userId });
        throw new Error('User not found');
      }

      // Step 2: Sync with Supabase Auth
      try {
        const { data: authUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (getUserError) {
          logger.warn('Failed to list Supabase Auth users for sync:', { error: getUserError.message });
        } else {
          const authUser = authUsers.users.find(u => u.email === updatedUser.email);
          
          if (authUser) {
            // Note: User ban/unban functionality depends on Supabase plan and version
            // For now, we'll just log the sync attempt
            logger.info(`User status sync attempted for Supabase Auth (${status}):`, { 
              userId, 
              email: updatedUser.email 
            });
          } else {
            logger.warn('User not found in Supabase Auth for sync:', { email: updatedUser.email });
          }
        }
      } catch (syncError) {
        logger.warn('Failed to sync user status with Supabase Auth:', { 
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
          userId 
        });
      }

      logger.info('User status updated successfully:', { userId, status });
      return updatedUser;

    } catch (error) {
      logger.error('User status update failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId 
      });
      throw error;
    }
  }

  /**
   * Change user password in Supabase Auth
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    const { email, newPassword } = passwordData;

    try {
      logger.info('Changing user password', { email });

      // Find user in Supabase Auth
      const { data: authUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (getUserError) {
        logger.error('Failed to list users for password change:', { error: getUserError.message });
        throw new Error('Failed to access authentication system');
      }

      const authUser = authUsers.users.find(u => u.email === email);
      
      if (!authUser) {
        logger.error('User not found in Supabase Auth for password change:', { email });
        throw new Error('User not found in authentication system');
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });

      if (updateError) {
        logger.error('Failed to update password in Supabase Auth:', { error: updateError.message, email });
        throw new Error(updateError.message);
      }

      logger.info('Password changed successfully:', { email });

    } catch (error) {
      logger.error('Password change failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email 
      });
      throw error;
    }
  }

  /**
   * Request password reset email
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    const { email } = resetData;

    try {
      logger.info('Password reset requested', { email });

      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      if (error) {
        logger.error('Failed to send password reset email:', { error: error.message, email });
        throw new Error(error.message);
      }

      logger.info('Password reset email sent:', { email });

    } catch (error) {
      logger.error('Password reset failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email 
      });
      throw error;
    }
  }

  /**
   * Check synchronization between our system and Supabase Auth
   */
  async checkSync(syncData: CheckSyncRequest): Promise<{ exists: boolean; status: string }> {
    const { email } = syncData;

    try {
      logger.info('Checking user synchronization', { email });

      // Check user in our system
      const { data: systemUser, error: systemError } = await supabaseAdmin
        .from('users')
        .select('status')
        .eq('email', email)
        .single();

      if (systemError || !systemUser) {
        logger.info('User not found in system:', { email });
        return { exists: false, status: 'not_found' };
      }

      // Check user in Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        logger.warn('Failed to check Supabase Auth for sync:', { error: authError.message });
        return { exists: true, status: systemUser.status };
      }

      const authUser = authUsers.users.find(u => u.email === email);
      
      if (!authUser) {
        logger.warn('User found in system but not in Supabase Auth:', { email });
        return { exists: true, status: 'auth_missing' };
      }

      logger.info('User synchronization checked:', { email, systemStatus: systemUser.status });
      return { exists: true, status: systemUser.status };

    } catch (error) {
      logger.error('Sync check failed:', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email 
      });
      throw error;
    }
  }

  /**
   * Generate a temporary password for new users
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const authService = new AuthService();