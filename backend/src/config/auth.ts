/**
 * Shared auth configuration — cookie options, JWT validation, rate limits.
 */
import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "usflix_token";

const WEAK_JWT_SECRETS = new Set([
  "usflix-super-secret-key-change-in-production",
  "your-super-secret-key-minimum-32-characters-long",
]);

/** Off in development by default; production keeps limits unless DISABLE_RATE_LIMIT=true. */
export function isRateLimitDisabled(): boolean {
  if (process.env.DISABLE_RATE_LIMIT === "true") return true;
  if (process.env.DISABLE_RATE_LIMIT === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function getAuthCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  };
}

/**
 * Ensures JWT_SECRET is strong enough before serving traffic in production.
 */
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 256;

export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string") {
    return "New password is required.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `New password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret.length < 32) {
    const msg = "JWT_SECRET must be set and at least 32 characters long.";
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(`⚠️  ${msg} Using a development fallback — never deploy without a strong secret.`);
    return;
  }

  if (WEAK_JWT_SECRETS.has(secret)) {
    const msg = "JWT_SECRET is a known placeholder value. Generate a unique secret before deploying.";
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(`⚠️  ${msg}`);
  }
}
