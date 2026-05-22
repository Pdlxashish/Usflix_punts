/**
 * Partner location sharing — device GPS only (IP fallback is opt-in).
 */
import { fetchApiJson } from "@/lib/fetchApi";
import { getClientId } from "@/lib/activity";
import { getLocationAccessInfo, getSecureAppUrl } from "@/lib/devServer";

export { getLocationAccessInfo, getSecureAppUrl } from "@/lib/devServer";

export const NEARBY_THRESHOLD_KM = 5;

export type PartnerLocation = {
  id: string;
  name: string;
  color: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  updatedAt: string | null;
  hasLocation: boolean;
  source?: LocationSource | null;
};

export type LocationStatus = {
  ok: boolean;
  partners: PartnerLocation[];
  distanceKm: number | null;
  formatted: { value: number; unit: "km" | "m" } | null;
  previousDistanceKm: number | null;
  notifyCloser: boolean;
  closerByKm: number;
  nearby: boolean;
  notifyNearby: boolean;
  partnerIds: string[];
  notifyThresholdKm?: number;
};

export type LocationSource = "gps" | "network";

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: LocationSource;
  city?: string;
};

export type TravelEstimate = {
  minutes: number;
  distanceKm: number;
  source: "route" | "estimate";
};

const LOCATION_CONSENT_PREFIX = "usflix_location_consent_";

function consentKey(profileId?: string): string {
  return profileId ? `${LOCATION_CONSENT_PREFIX}${profileId}` : "usflix_location_consent";
}

export function hasLocationConsent(profileId?: string): boolean {
  if (typeof window === "undefined") return false;
  if (profileId) {
    return localStorage.getItem(consentKey(profileId)) === "true";
  }
  return Object.keys(localStorage).some(
    (k) => k.startsWith(LOCATION_CONSENT_PREFIX) && localStorage.getItem(k) === "true"
  );
}

export function setLocationConsent(value: boolean, profileId?: string): void {
  if (typeof window === "undefined") return;
  const key = consentKey(profileId);
  if (value) {
    localStorage.setItem(key, "true");
  } else {
    localStorage.removeItem(key);
    if (!profileId) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(LOCATION_CONSENT_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  }
}

/** True when the page is served over HTTPS or localhost (browser allows GPS). */
export function canUseGps(): boolean {
  return getLocationAccessInfo().canUseGps;
}

/** User-facing hint when GPS is blocked (HTTP on LAN, wrong protocol, etc.). */
export function getGpsRequirementMessage(): string | null {
  return getLocationAccessInfo().requirementMessage;
}

function isGeolocationError(err: unknown): err is GeolocationPositionError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as GeolocationPositionError).code === "number"
  );
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Allow location for this site in your browser or phone settings, then try again.";
    case error.POSITION_UNAVAILABLE:
      return canUseGps()
        ? "GPS signal unavailable. Move near a window or enable Location Services on your phone."
        : (getGpsRequirementMessage() ?? "GPS unavailable.");
    case error.TIMEOUT:
      return "GPS timed out. Stay on this page a few seconds and try again (outdoors helps).";
    default:
      return error.message || "Could not read GPS from your device.";
  }
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Wait for first GPS fix via watchPosition (often faster on phones). */
function watchForFirstFix(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        reject(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      reject(new Error("GPS watch timed out"));
    }, timeoutMs);
  });
}

/**
 * Read real coordinates from the device GPS chip / OS location service.
 * Does not use IP geolocation unless allowNetworkFallback is true.
 */
export async function resolveDeviceLocation(options?: {
  allowNetworkFallback?: boolean;
}): Promise<ResolvedLocation> {
  const allowNetworkFallback = options?.allowNetworkFallback ?? false;

  if (!navigator.geolocation) {
    if (allowNetworkFallback) return fetchNetworkLocation();
    throw new Error(getGpsRequirementMessage() ?? "Geolocation is not supported.");
  }

  if (!canUseGps() && !allowNetworkFallback) {
    throw new Error(getGpsRequirementMessage() ?? "GPS requires HTTPS or localhost.");
  }

  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true, timeout: 35000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 35000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 45000, maximumAge: 15000 },
  ];

  let lastErr: unknown;

  for (const opts of attempts) {
    try {
      const pos = await getCurrentPosition(opts);
      return positionToLocation(pos);
    } catch (err) {
      lastErr = err;
      if (isGeolocationError(err) && err.code === err.PERMISSION_DENIED) {
        throw new Error(geolocationErrorMessage(err));
      }
    }
  }

  try {
    const pos = await watchForFirstFix(45000);
    return positionToLocation(pos);
  } catch (err) {
    lastErr = err;
    if (isGeolocationError(err) && err.code === err.PERMISSION_DENIED) {
      throw new Error(geolocationErrorMessage(err));
    }
  }

  if (allowNetworkFallback) {
    try {
      return await fetchNetworkLocation();
    } catch {
      /* fall through */
    }
  }

  if (isGeolocationError(lastErr)) {
    throw new Error(geolocationErrorMessage(lastErr));
  }
  if (!canUseGps()) {
    throw new Error(getGpsRequirementMessage() ?? "Could not get GPS.");
  }
  throw new Error(
    lastErr instanceof Error ? lastErr.message : "Could not get GPS from your device."
  );
}

function positionToLocation(pos: GeolocationPosition): ResolvedLocation {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    source: "gps",
  };
}

/** Approximate location from public IP — opt-in only, not device GPS. */
export async function fetchNetworkLocation(): Promise<ResolvedLocation> {
  const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("Network location lookup failed.");
  const data = await res.json();
  if (!data.success || data.latitude == null || data.longitude == null) {
    throw new Error("Could not estimate location from network.");
  }
  return {
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracy: 50000,
    source: "network",
    city: data.city ? `${data.city}${data.country ? `, ${data.country}` : ""}` : undefined,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchTravelEstimate(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<TravelEstimate> {
  const straightKm = haversineKm(lat1, lon1, lat2, lon2);
  const fallback = (): TravelEstimate => ({
    minutes: Math.max(1, Math.round((straightKm / 50) * 60)),
    distanceKm: Math.round(straightKm * 10) / 10,
    source: "estimate",
  });

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return fallback();
    const route = data.routes[0];
    return {
      minutes: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      source: "route",
    };
  } catch {
    return fallback();
  }
}

export function formatTravelMinutes(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export async function fetchLocationStatus(): Promise<LocationStatus> {
  return fetchApiJson<LocationStatus>("/location/status", { method: "GET" });
}

export async function shareProfileLocation(
  profileId: string,
  location: ResolvedLocation
): Promise<void> {
  const body = await fetchApiJson<{ ok: boolean; error?: string }>("/location", {
    method: "POST",
    body: JSON.stringify({
      profileId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      city: location.city,
      source: location.source,
      clientId: getClientId(),
    }),
  });

  if (!body.ok) {
    throw new Error(
      body.error ||
        "Could not save location. Restart the backend server if you recently updated the app."
    );
  }
}

const WATCH_MIN_INTERVAL_MS = 60_000;
const WATCH_MIN_MOVE_M = 80;

export function startLocationWatch(
  onLocation: (location: ResolvedLocation) => void,
  onError?: (message: string) => void
): () => void {
  if (!navigator.geolocation) return () => {};

  let lastShareAt = 0;
  let lastLat: number | null = null;
  let lastLng: number | null = null;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const now = Date.now();

      let movedEnough = true;
      if (lastLat != null && lastLng != null) {
        const movedKm = haversineKm(lastLat, lastLng, lat, lng);
        movedEnough = movedKm * 1000 >= WATCH_MIN_MOVE_M;
      }

      if (!movedEnough && now - lastShareAt < WATCH_MIN_INTERVAL_MS) return;

      lastLat = lat;
      lastLng = lng;
      lastShareAt = now;

      onLocation(positionToLocation(pos));
    },
    (err) => onError?.(geolocationErrorMessage(err)),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 }
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

/** @deprecated use resolveDeviceLocation */
export function requestDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(new Error(geolocationErrorMessage(err)));
    }, {
      enableHighAccuracy: true,
      timeout: 35000,
      maximumAge: 0,
    });
  });
}
