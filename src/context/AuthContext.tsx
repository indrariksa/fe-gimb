import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { ApiTimeoutError, configureApiClient, timeoutMessage } from "../services/api/client";
import * as authApi from "../services/api/auth";
import type { AuthResponse, RegisterResponse, User } from "../services/api/types";

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
  googleLogin: (payload: { id_token: string }) => Promise<User>;
  register: (payload: { email: string; password: string; full_name: string }) => Promise<RegisterResponse>;
  updateProfile: (payload: { full_name: string }) => Promise<User>;
  linkGoogleAccount: (payload: { id_token: string }) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const storageKey = "gimb:auth";
const refreshSkewSeconds = 60;
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

function accessTokenExpiresSoon(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return true;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    if (!decoded.exp) return true;
    return decoded.exp * 1000 <= Date.now() + refreshSkewSeconds * 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());
  const [isLoading, setIsLoading] = useState(true);
  const [showTimeoutNotice, setShowTimeoutNotice] = useState(false);

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
      onRefreshAuth: async () => {
        const stored = readStoredAuth();
        if (!stored?.refreshToken) return null;
        try {
          const refreshed = await authApi.refreshToken(stored.refreshToken);
          const nextAuth = authFromResponse(refreshed);
          persistAuth(nextAuth);
          return nextAuth.accessToken;
        } catch (error) {
          if (error instanceof ApiTimeoutError) throw error;
          persistAuth(null);
          return null;
        }
      },
      onUnauthorized: () => persistAuth(null),
      onTimeout: () => setShowTimeoutNotice(true),
    });
  }, [persistAuth]);

  useEffect(() => {
    if (!showTimeoutNotice) return;
    const timeout = window.setTimeout(() => setShowTimeoutNotice(false), 5_000);
    return () => window.clearTimeout(timeout);
  }, [showTimeoutNotice]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const stored = readStoredAuth();
      if (!stored?.refreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }
      if (stored.accessToken && !accessTokenExpiresSoon(stored.accessToken)) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const refreshed = await authApi.refreshToken(stored.refreshToken);
        if (isMounted) persistAuth(authFromResponse(refreshed));
      } catch (error) {
        if (isMounted && !(error instanceof ApiTimeoutError)) persistAuth(null);
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

  const handleGoogleLogin = useCallback(async (payload: { id_token: string }) => {
    const response = await authApi.googleLogin(payload);
    const nextAuth = authFromResponse(response);
    persistAuth(nextAuth);
    return nextAuth.user;
  }, [persistAuth]);

  const handleRegister = useCallback(async (payload: { email: string; password: string; full_name: string }) => {
    return authApi.register(payload);
  }, []);

  const updateProfile = useCallback(async (payload: { full_name: string }) => {
    const stored = readStoredAuth();
    if (!stored) throw new Error("Session tidak ditemukan");
    const user = await authApi.updateProfile(payload);
    persistAuth({ ...stored, user });
    return user;
  }, [persistAuth]);

  const linkGoogleAccount = useCallback(async (payload: { id_token: string }) => {
    const stored = readStoredAuth();
    if (!stored) throw new Error("Session tidak ditemukan");
    const user = await authApi.linkGoogleAccount(payload);
    persistAuth({ ...stored, user });
    return user;
  }, [persistAuth]);

  const refreshUser = useCallback(async () => {
    const stored = readStoredAuth();
    if (!stored) return null;
    const user = await authApi.me();
    persistAuth({ ...stored, user });
    return user;
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
    googleLogin: handleGoogleLogin,
    register: handleRegister,
    updateProfile,
    linkGoogleAccount,
    refreshUser,
    logout: handleLogout,
  }), [auth, handleGoogleLogin, handleLogin, handleLogout, handleRegister, isLoading, linkGoogleAccount, refreshUser, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showTimeoutNotice && (
        <div className="api-timeout-notice" role="alert" aria-live="assertive">
          <strong>Koneksi timeout</strong>
          <span>{timeoutMessage}</span>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
