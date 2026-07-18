import { apiRequest } from "./client";
import type { AuthResponse, ChangePasswordPayload, SetupPasswordPayload, User } from "./types";

let pendingRefresh: Promise<AuthResponse> | null = null;

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

export function googleLogin(payload: { id_token: string }) {
  return apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function refreshToken(refresh_token: string) {
  if (!pendingRefresh) {
    pendingRefresh = apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ refresh_token }),
    }).finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

export function me() {
  return apiRequest<User>("/me");
}

export function changePassword(payload: ChangePasswordPayload) {
  return apiRequest<null>("/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setupPassword(payload: SetupPasswordPayload) {
  return apiRequest<null>("/me/password/setup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(refresh_token: string) {
  return apiRequest<null>("/auth/logout", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ refresh_token }),
  });
}
