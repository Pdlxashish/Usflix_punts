/**
 * Dev server + GPS secure-context helpers (HTTPS on port 8080 for map/location).
 */

/** Vite dev port (npm run dev). */
export const DEV_APP_PORT = "8080";

export function isDevLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isPrivateLanHost(hostname: string): boolean {
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/** HTTPS URL for this app (current origin if already HTTPS, else upgraded). */
export function getSecureAppUrl(): string {
  if (typeof window === "undefined") {
    return `https://localhost:${DEV_APP_PORT}`;
  }
  const { protocol, hostname, port } = window.location;
  if (protocol === "https:") return window.location.origin;
  const p = port || DEV_APP_PORT;
  return `https://${hostname}:${p}`;
}

export type LocationAccessInfo = {
  canUseGps: boolean;
  isSecureContext: boolean;
  needsHttpsUpgrade: boolean;
  secureUrl: string;
  /** Shown on the map section when GPS is blocked (e.g. http:// on a phone). */
  requirementMessage: string | null;
  /** Short positive note when GPS is allowed. */
  readyMessage: string | null;
};

export function getLocationAccessInfo(): LocationAccessInfo {
  const secureUrl = getSecureAppUrl();

  if (typeof window === "undefined") {
    return {
      canUseGps: false,
      isSecureContext: false,
      needsHttpsUpgrade: true,
      secureUrl,
      requirementMessage: null,
      readyMessage: null,
    };
  }

  const hasGeo = Boolean(navigator.geolocation);
  const isSecureContext = window.isSecureContext;
  const { protocol, hostname } = window.location;
  const onLocalhost = isDevLocalhost(hostname);
  const onLan = isPrivateLanHost(hostname);
  const needsHttpsUpgrade =
    hasGeo && !isSecureContext && (onLan || (onLocalhost && protocol === "http:"));

  const canUseGps = hasGeo && (isSecureContext || onLocalhost);

  let requirementMessage: string | null = null;
  if (!hasGeo) {
    requirementMessage = "Your browser does not support GPS on this device.";
  } else if (needsHttpsUpgrade) {
    requirementMessage = onLan
      ? `Map GPS needs HTTPS on your phone. Open ${secureUrl} (same Wi‑Fi), tap Advanced → Proceed if warned, allow location, then share again.`
      : `Map GPS needs HTTPS. Open ${secureUrl} (npm run dev uses HTTPS on port ${DEV_APP_PORT}), accept the certificate warning if asked, then share location.`;
  } else if (protocol === "http:" && onLocalhost) {
    requirementMessage = `You opened HTTP. For GPS on phones, use ${secureUrl} instead.`;
  }

  const readyMessage =
    canUseGps && isSecureContext
      ? protocol === "https:" && onLan
        ? "Secure connection — device GPS and live map updates are enabled."
        : protocol === "https:"
          ? "Secure connection — GPS and map location sharing are enabled."
          : null
      : null;

  return {
    canUseGps,
    isSecureContext,
    needsHttpsUpgrade,
    secureUrl,
    requirementMessage,
    readyMessage,
  };
}
