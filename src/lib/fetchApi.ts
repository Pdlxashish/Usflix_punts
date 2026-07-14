/**
 * Resilient API fetch — works in browser (Vite proxy) and Capacitor native apps.
 *
 * In a Capacitor app there is no Vite proxy, so all requests must go to the
 * absolute backend URL. BACKEND_URL is set from VITE_API_URL at build time.
 */
import { BACKEND_URL } from "@/lib/api";
import { getClerkSessionToken } from "@/lib/clerk-token";

function buildUrls(endpoint: string): string[] {
  const path = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  if (BACKEND_URL) {
    // Capacitor / production: only use the absolute URL
    return [`${BACKEND_URL}${path}`];
  }

  // Browser dev: try Vite proxy first, then direct backend as fallback
  return [path, `http://localhost:3001${path}`];
}

export async function fetchApiJson<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const urls = buildUrls(endpoint);
  let lastError = "Could not reach the server";

  for (const url of urls) {
    try {
      const token = await getClerkSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string>),
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(url, {
        credentials: "include",
        ...init,
        headers,
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        lastError =
          (errBody as { error?: string }).error ||
          `${response.status} ${response.statusText}`;
        continue;
      }
      return (await response.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }

  throw new Error(lastError);
}
