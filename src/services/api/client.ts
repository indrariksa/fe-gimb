import type { ApiEnvelope } from "./types";

const defaultBaseUrl = "http://127.0.0.1:8080/api/v1";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;
const requestTimeoutMs = 15_000;
export const timeoutMessage = "Koneksi ke server terlalu lama. Silakan coba lagi.";

let accessTokenProvider: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;
let onTimeout: (() => void) | null = null;

export function configureApiClient(options: {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
  onTimeout: () => void;
}) {
  accessTokenProvider = options.getAccessToken;
  onUnauthorized = options.onUnauthorized;
  onTimeout = options.onTimeout;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super(timeoutMessage);
    this.name = "ApiTimeoutError";
  }
}

export function getFriendlyApiError(error: unknown, fallback = "Terjadi kesalahan. Coba lagi beberapa saat."): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Terlalu banyak percobaan, coba lagi beberapa menit.";
    if (error.status === 413) return "Data yang dikirim terlalu besar. Kurangi isi deskripsi lalu coba lagi.";
    if (error.status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat.";
    return error.message || fallback;
  }

  if (error instanceof TypeError) {
    return "Tidak bisa terhubung ke server. Pastikan API aktif dan origin frontend sudah diizinkan di CORS_ALLOWED_ORIGINS.";
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = Boolean(options.body);

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = accessTokenProvider?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      onTimeout?.();
      throw new ApiTimeoutError();
    }
    throw error;
  }
  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || envelope.success === false) {
    if (response.status === 401 && options.auth !== false) onUnauthorized?.();
    throw new ApiError(response.status, envelope.message ?? "Request failed", envelope.error);
  }

  return envelope.data as T;
}
