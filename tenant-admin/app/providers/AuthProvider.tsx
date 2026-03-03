'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload, UserRole, LoginRequest, RegisterRequest } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { setTokens, clearTokens, getAccessToken, decodeToken } from '@/lib/auth';

interface AuthContextType {
  user: JwtPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const payload = jwtDecode<JwtPayload>(token);
        if (payload.exp * 1000 > Date.now()) {
          setUser(payload);
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (data: LoginRequest) => {
      const response = await authService.login(data);
      setTokens(response);
      const payload = jwtDecode<JwtPayload>(response.accessToken);
      setUser(payload);
      router.push('/');
    },
    [router],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const response = await authService.register(data);
      setTokens(response);
      const payload = jwtDecode<JwtPayload>(response.accessToken);
      setUser(payload);
      router.push('/');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
