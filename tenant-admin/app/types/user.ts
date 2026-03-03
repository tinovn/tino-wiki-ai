import { UserRole } from './auth';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
}
