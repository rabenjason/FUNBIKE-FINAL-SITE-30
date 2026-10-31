import type { ApiEnvelope, AuthResponse, Product, User } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: string[];

  constructor(status: number, message: string, code?: string, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

/** Résout une image téléversée (/uploads/...) vers l'API quand elle est sur un autre domaine. */
export function resolveApiAssetUrl(url: string) {
  return url.startsWith("/uploads/") && API_BASE_URL ? `${API_BASE_URL}${url}` : url;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (response.status === 204) {
    return { success: true, data: undefined as T };
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.error?.message ?? `L’API a répondu avec le statut ${response.status}.`,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return payload;
}

async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(typeof FormData !== "undefined" && init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  return parseEnvelope<T>(response);
}

async function refreshAccessToken(): Promise<AuthResponse> {
  refreshPromise ??= rawRequest<AuthResponse>("/api/auth/refresh", { method: "POST" })
    .then((payload) => {
      setAccessToken(payload.data.accessToken);
      return payload.data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/**
 * Appel API du Dashboard. En cas de jeton d'accès expiré, la session est
 * renouvelée une seule fois depuis le cookie HttpOnly, puis l'appel est rejoué.
 */
export async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  try {
    return await rawRequest<T>(path, init);
  } catch (error) {
    const canRefresh =
      retry &&
      error instanceof ApiError &&
      error.status === 401 &&
      !path.startsWith("/api/auth/login") &&
      !path.startsWith("/api/auth/refresh");

    if (!canRefresh) throw error;

    await refreshAccessToken();
    return rawRequest<T>(path, init);
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const payload = await rawRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(payload.data.accessToken);
  return payload.data;
}

export async function restoreSession(): Promise<User> {
  const refreshed = await refreshAccessToken();
  return refreshed.user;
}

export async function fetchCurrentUser(): Promise<User> {
  const payload = await request<User>("/api/auth/me");
  return payload.data;
}

export async function logout(): Promise<void> {
  try {
    await rawRequest<void>("/api/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export interface UploadedImage {
  imageUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}

export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);
  const payload = await request<UploadedImage>("/api/products/images", {
    method: "POST",
    body: formData,
  });
  return payload.data;
}

export async function fetchProducts(): Promise<Product[]> {
  const payload = await request<Product[]>("/api/products?limit=500");
  return payload.data;
}

export async function fetchUsers(): Promise<User[]> {
  const payload = await request<User[]>("/api/users?limit=500");
  return payload.data;
}

export async function checkApiHealth(): Promise<{ api: boolean; database: boolean }> {
  try {
    await rawRequest<unknown>("/health");
  } catch {
    return { api: false, database: false };
  }

  try {
    await rawRequest<unknown>("/health/db");
    return { api: true, database: true };
  } catch {
    return { api: true, database: false };
  }
}
