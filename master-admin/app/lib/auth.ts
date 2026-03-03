import { apiPost } from "./api";

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

export async function masterLogin(email: string, password: string) {
  const res = await apiPost<LoginResponse>("/master/auth/login", { email, password });
  localStorage.setItem("master_token", res.data.accessToken);
  localStorage.setItem("master_refresh_token", res.data.refreshToken);
  return res.data;
}

export function masterLogout() {
  localStorage.removeItem("master_token");
  localStorage.removeItem("master_refresh_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("master_token");
}
