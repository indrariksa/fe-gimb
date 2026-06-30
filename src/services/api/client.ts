import type { ApiEnvelope } from "./types";

const defaultBaseUrl = "http://127.0.0.1:8080/api/v1";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;

let accessTokenProvider: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApiClient(options: {
  getAccessToken: () => string | null;
  onUnauthorized: () => void;
}) {
  accessTokenProvider = options.getAccessToken;
  onUnauthorized = options.onUnauthorized;
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

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || envelope.success === false) {
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(response.status, envelope.message ?? "Request failed", envelope.error);
  }

  return envelope.data as T;
}
