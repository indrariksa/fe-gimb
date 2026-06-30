import { apiRequest } from "./client";
import type { AuthResponse, User } from "./types";

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function register(payload: { email: string; password: string; full_name: string }) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function refreshToken(refresh_token: string) {
  return apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ refresh_token }),
  });
}

export function me() {
  return apiRequest<User>("/me");
}

export function logout(refresh_token: string) {
  return apiRequest<null>("/auth/logout", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ refresh_token }),
  });
}
