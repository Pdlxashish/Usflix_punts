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
 * 
 * This function tries multiple strategies to get the most accurate device GPS location:
 * 1. High accuracy GPS with no cache
 * 2. Watch position for first fix (often faster on mobile)
 * 3. Lower accuracy GPS as fallback
 * 4. Network location if explicitly allowed
 */
export async function resolveDeviceLocation(options?: {
  allowNetworkFallback?: boolean;
}): Promise<ResolvedLocation> {
  const allowNetworkFallback = options?.allowNetworkFallback ?? false;

  console.log('[GPS] Requesting device location...', {
    allowNetworkFallback,
    canUseGps: canUseGps(),
    hasGeolocation: !!navigator.geolocation
  });

  if (!navigator.geolocation) {
    console.error('[GPS] Geolocation API not available');
    if (allowNetworkFallback) return fetchNetworkLocation();
    throw new Error(getGpsRequirementMessage() ?? "Geolocation is not supported.");
  }

  if (!canUseGps() && !allowNetworkFallback) {
    console.error('[GPS] GPS not available (requires HTTPS)');
    throw new Error(getGpsRequirementMessage() ?? "GPS requires HTTPS or localhost.");
  }

  // Strategy 1: Try high-accuracy GPS first (this uses the GPS chip)
  const attempts: PositionOptions[] = [
    { enableHighAccuracy: true, timeout: 35000, maximumAge: 0 },
  ];

  let lastErr: unknown;

  for (const opts of attempts) {
    try {
      console.log('[GPS] Attempting getCurrentPosition with options:', opts);
      const pos = await getCurrentPosition(opts);
      console.log('[GPS] Success! Got position:', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'gps'
      });
      return positionToLocation(pos);
    } catch (err) {
      lastErr = err;
      console.warn('[GPS] getCurrentPosition failed:', err);
      if (isGeolocationError(err) && err.code === err.PERMISSION_DENIED) {
        throw new Error(geolocationErrorMessage(err));
      }
    }
  }

  // Strategy 2: Try watchPosition for first fix (often faster on phones)
  try {
    console.log('[GPS] Trying watchPosition for first fix...');
    const pos = await watchForFirstFix(45000);
    console.log('[GPS] Success via watch! Got position:', {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      source: 'gps'
    });
    return positionToLocation(pos);
  } catch (err) {
    lastErr = err;
    console.warn('[GPS] watchPosition failed:', err);
    if (isGeolocationError(err) && err.code === err.PERMISSION_DENIED) {
      throw new Error(geolocationErrorMessage(err));
    }
  }

  // Strategy 3: Try lower accuracy as last resort
  try {
    console.log('[GPS] Trying low-accuracy fallback...');
    const pos = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 35000,
      maximumAge: 15000
    });
    console.log('[GPS] Success with low-accuracy! Got position:', {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      source: 'gps'
    });
    return positionToLocation(pos);
  } catch (err) {
    lastErr = err;
    console.warn('[GPS] Low-accuracy attempt failed:', err);
  }

  // Strategy 4: Network fallback if allowed
  if (allowNetworkFallback) {
    try {
      console.log('[GPS] Falling back to network location...');
      const networkLoc = await fetchNetworkLocation();
      console.log('[GPS] Network location obtained:', networkLoc);
      return networkLoc;
    } catch (err) {
      console.error('[GPS] Network fallback also failed:', err);
      /* fall through */
    }
  }

  // All strategies failed
  console.error('[GPS] All location strategies failed');
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

const WATCH_MIN_INTERVAL_MS = 30_000; // Reduced from 60s to 30s for more frequent updates
const WATCH_MIN_MOVE_M = 50; // Reduced from 80m to 50m for more sensitive movement detection

/**
 * Helper to calculate if user has moved enough to warrant an update
 */
function hasMovedEnough(
  prevLat: number | null,
  prevLng: number | null,
  newLat: number,
  newLng: number,
  thresholdMeters: number
): boolean {
  if (prevLat === null || prevLng === null) return true;
  const movedKm = haversineKm(prevLat, prevLng, newLat, newLng);
  return movedKm * 1000 >= thresholdMeters;
}

/**
 * Start watching device GPS location with real-time updates.
 * Uses navigator.geolocation.watchPosition for continuous monitoring.
 * 
 * @param onLocation - Callback fired when location updates (after debounce/distance filter)
 * @param onError - Callback fired on geolocation errors
 * @returns Cleanup function to stop watching
 */
export function startLocationWatch(
  onLocation: (location: ResolvedLocation) => void,
  onError?: (message: string) => void
): () => void {
  if (!navigator.geolocation) return () => {};

  let lastShareAt = 0;
  let lastLat: number | null = null;
  let lastLng: number | null = null;

  console.log('[LocationWatch] Starting GPS watch with enableHighAccuracy=true');

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const now = Date.now();

      console.log('[LocationWatch] GPS update received:', {
        latitude: lat,
        longitude: lng,
        accuracy: pos.coords.accuracy,
        timestamp: new Date(pos.timestamp).toISOString()
      });

      // Check if enough time has passed since last share
      const timeElapsed = now - lastShareAt;
      const timeThresholdMet = timeElapsed >= WATCH_MIN_INTERVAL_MS;

      // Check if user has moved enough distance
      const movedEnough = hasMovedEnough(lastLat, lastLng, lat, lng, WATCH_MIN_MOVE_M);

      // Only update if BOTH conditions are met: time threshold AND movement threshold
      if (!movedEnough && !timeThresholdMet) {
        console.log('[LocationWatch] Skipping update - insufficient movement or time:', {
          movedEnough,
          timeThresholdMet,
          timeElapsed: `${Math.round(timeElapsed / 1000)}s`
        });
        return;
      }

      console.log('[LocationWatch] Sending location update:', {
        movedEnough,
        timeThresholdMet,
        timeSinceLastShare: `${Math.round(timeElapsed / 1000)}s`
      });

      lastLat = lat;
      lastLng = lng;
      lastShareAt = now;

      onLocation(positionToLocation(pos));
    },
    (err) => {
      console.error('[LocationWatch] GPS error:', err);
      onError?.(geolocationErrorMessage(err));
    },
    {
      enableHighAccuracy: true,  // Use GPS chip, not WiFi/cell tower triangulation
      maximumAge: 0,              // Don't use cached positions
      timeout: 60000              // Allow up to 60s to get GPS fix
    }
  );

  console.log('[LocationWatch] Watch started with ID:', watchId);

  return () => {
    console.log('[LocationWatch] Stopping GPS watch:', watchId);
    navigator.geolocation.clearWatch(watchId);
  };
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
