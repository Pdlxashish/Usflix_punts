/**
 * API utility — works in browser (via Vite proxy in dev, same-origin in prod)
 * AND inside a Capacitor native app (must use absolute URL since there's no proxy).
 *
 * Priority order for the backend URL:
 *  1. VITE_API_URL env var (set this in production / Capacitor builds)
 *  2. Capacitor native context → use window.location won't work, so we fall
 *     back to the env var. Always set VITE_API_URL when building for mobile.
 *  3. Same-origin (empty string) — works when frontend is served from the
 *     same domain as the backend (Docker / VPS deployment).
 *  4. localhost:3001 — local development fallback.
 */

function resolveBackendUrl(): string {
  // Explicit env var always wins (required for Capacitor builds)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, ""); // strip trailing slash
  }

  // Production web build served from same domain — use relative URLs
  if (import.meta.env.PROD) {
    return "";
  }

  // Local dev fallback
  return "http://localhost:3001";
}

export const BACKEND_URL = resolveBackendUrl();

/**
 * Convert a relative upload path to a full URL.
 * Handles both relative paths (/uploads/...) and full URLs.
 */
export function getMediaUrl(path: string | undefined | null): string {
  if (!path) return "";

  // Already a full URL — return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Relative path — prepend backend URL
  if (path.startsWith("/")) {
    return `${BACKEND_URL}${path}`;
  }

  // Bare filename — assume it lives under /uploads/
  return `${BACKEND_URL}/uploads/${path}`;
}

/**
 * Build a full API endpoint URL.
 */
export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${BACKEND_URL}/api/${clean}`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type ApiErrorBody = { error?: string; ok?: boolean };

async function parseJsonBody<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function apiPath(endpoint: string): string {
  // If already absolute, return as-is
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const path = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;
  // In a Capacitor native context BACKEND_URL is set, so prepend it
  return BACKEND_URL ? `${BACKEND_URL}${path}` : path;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  async postSafe<T extends ApiErrorBody>(
    endpoint: string,
    data?: unknown
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
    const response = await fetch(apiPath(endpoint), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });

    const body = await parseJsonBody<T>(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          body?.error ||
          (response.status === 429
            ? "Too many failed attempts. Please try again later."
            : "Request failed. Please try again."),
      };
    }

    return { ok: true, status: response.status, data: body };
  },

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(apiPath(endpoint), {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const body = await parseJsonBody<ApiErrorBody>(response);
      throw new Error(body?.error || `${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(apiPath(endpoint), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const body = await parseJsonBody<ApiErrorBody>(response);
      throw new Error(body?.error || `${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(apiPath(endpoint), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const body = await parseJsonBody<ApiErrorBody>(response);
      throw new Error(body?.error || `${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(apiPath(endpoint), {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const body = await parseJsonBody<ApiErrorBody>(response);
      throw new Error(body?.error || `${response.status} ${response.statusText}`);
    }
    return response.json();
  },

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(apiPath(endpoint), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const body = await parseJsonBody<ApiErrorBody>(response);
      throw new Error(body?.error || `${response.status} ${response.statusText}`);
    }
    return response.json();
  },
};
