import { jwtDecode } from 'jwt-decode';
import type { JwtPayload, TokenResponse } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TENANT_ID_KEY = 'tenantId';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  // Also set a cookie flag for Next.js middleware
  document.cookie = `accessToken=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = 'accessToken=; path=/; max-age=0';
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TENANT_ID_KEY) || process.env.NEXT_PUBLIC_TENANT_ID || null;
}

export function setTenantId(id: string): void {
  localStorage.setItem(TENANT_ID_KEY, id);
}

export function decodeToken(): JwtPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const payload = decodeToken();
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
}
