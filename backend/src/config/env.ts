/**
 * Production environment validation and helpers.
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Comma-separated FRONTEND_URL values (e.g. https://app.example.com,capacitor://localhost). */
export function getAllowedFrontendOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Demo collections/media are skipped in production unless SEED_DEMO_DATA=true. */
export function shouldSeedDemoData(): boolean {
  if (process.env.SEED_DEMO_DATA === "true") return true;
  if (process.env.SEED_DEMO_DATA === "false") return false;
  return !isProduction();
}

export function getMinAdminPasswordLength(): number {
  return isProduction() ? 12 : 6;
}

/**
 * Validates required production configuration before accepting traffic.
 */
export function validateProductionEnv(): void {
  if (!isProduction()) return;

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required when NODE_ENV=production.");
  }

  const origins = getAllowedFrontendOrigins();
  if (origins.length === 0) {
    throw new Error("FRONTEND_URL must list at least one allowed origin in production.");
  }

  for (const origin of origins) {
    const isNative =
      origin.startsWith("capacitor://") ||
      origin.startsWith("ionic://") ||
      origin === "http://localhost";
    if (!isNative && !origin.startsWith("https://")) {
      console.warn(
        `⚠️  FRONTEND_URL origin "${origin}" is not HTTPS — admin cookies require HTTPS in production.`,
      );
    }
  }

  const adminPass = process.env.ADMIN_PASSWORD;
  const minLen = getMinAdminPasswordLength();
  if (!process.env.ADMIN_USERNAME?.trim() || !adminPass || adminPass.length < minLen) {
    console.warn(
      `⚠️  Set ADMIN_USERNAME and ADMIN_PASSWORD (min ${minLen} chars) before first deploy to seed the admin account.`,
    );
  }
}
