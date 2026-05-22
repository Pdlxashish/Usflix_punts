/**
 * API Configuration
 * Handles dynamic backend URL for mobile device compatibility
 */

/**
 * Get the backend API URL
 * - In development: Uses VITE_API_URL or falls back to localhost
 * - In production: Uses the deployed backend URL
 * - For mobile testing: Set VITE_API_URL to your computer's IP (e.g., http://192.168.1.100:3001)
 */
export function getApiUrl(): string {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In production, use relative URLs (same domain)
  if (import.meta.env.PROD) {
    return '';
  }

  // Development fallback
  return 'http://localhost:3001';
}

/**
 * Get the full URL for an uploaded file
 * Handles both relative paths (/uploads/...) and full URLs
 */
export function getMediaUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;

  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // If it's a relative path, prepend the API URL
  if (path.startsWith('/uploads')) {
    return `${getApiUrl()}${path}`;
  }

  // For asset imports (starting with /src or /assets), return as-is
  if (path.startsWith('/src') || path.startsWith('/assets')) {
    return path;
  }

  return path;
}

/**
 * API client configuration
 */
export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: 30000,
  withCredentials: true,
};

export default API_CONFIG;
