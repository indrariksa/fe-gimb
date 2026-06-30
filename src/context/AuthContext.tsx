import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { configureApiClient } from "../services/api/client";
import * as authApi from "../services/api/auth";
import type { AuthResponse, User } from "../services/api/types";

type StoredAuth = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<User>;
  register: (payload: { email: string; password: string; full_name: string }) => Promise<User>;
  logout: () => Promise<void>;
};

const storageKey = "gimb:auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth(): StoredAuth | null {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as StoredAuth;
  } catch {
    return null;
  }
}

function authFromResponse(response: AuthResponse): StoredAuth {
  return {
    user: response.user,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = useCallback((nextAuth: StoredAuth | null) => {
    setAuth(nextAuth);
    if (nextAuth) {
      localStorage.setItem(storageKey, JSON.stringify(nextAuth));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => readStoredAuth()?.accessToken ?? null,
      onUnauthorized: () => persistAuth(null),
    });
  }, [persistAuth]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const stored = readStoredAuth();
      if (!stored?.refreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const refreshed = await authApi.refreshToken(stored.refreshToken);
        if (isMounted) persistAuth(authFromResponse(refreshed));
      } catch {
        if (isMounted) persistAuth(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [persistAuth]);

  const handleLogin = useCallback(async (payload: { email: string; password: string }) => {
    const response = await authApi.login(payload);
    const nextAuth = authFromResponse(response);
    persistAuth(nextAuth);
    return nextAuth.user;
  }, [persistAuth]);

  const handleRegister = useCallback(async (payload: { email: string; password: string; full_name: string }) => {
    const response = await authApi.register(payload);
    const nextAuth = authFromResponse(response);
    persistAuth(nextAuth);
    return nextAuth.user;
  }, [persistAuth]);

  const handleLogout = useCallback(async () => {
    const token = auth?.refreshToken;
    persistAuth(null);
    if (token) {
      await authApi.logout(token).catch(() => undefined);
    }
  }, [auth?.refreshToken, persistAuth]);

  const value = useMemo<AuthContextValue>(() => ({
    user: auth?.user ?? null,
    accessToken: auth?.accessToken ?? null,
    refreshToken: auth?.refreshToken ?? null,
    isAuthenticated: Boolean(auth?.accessToken),
    isAdmin: auth?.user.role === "admin",
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  }), [auth, handleLogin, handleLogout, handleRegister, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
