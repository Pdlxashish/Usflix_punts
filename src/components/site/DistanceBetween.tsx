/**
 * Distance Between Us — map, live distance, proximity alerts, travel time.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Heart, Bell, Loader2, RefreshCw, AlertCircle, Clock, Car, Satellite } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useProfile } from "@/context/profile";
import { useToast } from "@/components/ui/Toast";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import {
  fetchLocationStatus,
  fetchTravelEstimate,
  formatTravelMinutes,
  getLocationAccessInfo,
  NEARBY_THRESHOLD_KM,
  type LocationStatus,
  type PartnerLocation,
  type TravelEstimate,
} from "@/lib/partnerLocation";

const PROFILE_COLORS: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-rose-500": "#f43f5e",
  "bg-purple-500": "#a855f7",
};

function createHeartIcon(colorClass: string, label: string): L.DivIcon {
  const hex = PROFILE_COLORS[colorClass] ?? "#e50914";
  return L.divIcon({
    className: "distance-map-marker",
    html: `<div class="distance-marker-pin" style="--pin-color:${hex}" title="${label}">
      <span class="distance-marker-heart">♥</span>
      <span class="distance-marker-label">${label}</span>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 44],
  });
}

function createDistanceLabel(text: string, highlight: boolean): L.DivIcon {
  return L.divIcon({
    className: "distance-map-label-wrap",
    html: `<div class="distance-map-label ${highlight ? "distance-map-label--near" : ""}">${text}</div>`,
    iconSize: [120, 32],
    iconAnchor: [60, 16],
  });
}

function formatUpdated(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

function pushNotification(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function DistanceBetween() {
  const { activeProfile } = useProfile();
  const toast = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const labelMarkerRef = useRef<L.Marker | null>(null);

  const [status, setStatus] = useState<LocationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [travel, setTravel] = useState<TravelEstimate | null>(null);
  const [pulseCloser, setPulseCloser] = useState(false);
  const [pulseNearby, setPulseNearby] = useState(false);
  const lastNotifyAtRef = useRef(0);
  const locationAccess = getLocationAccessInfo();
  const gpsHint = locationAccess.requirementMessage;
  const gpsReadyHint = locationAccess.readyMessage;

  // Use the new useLiveLocation hook for automatic GPS tracking
  const liveLocation = useLiveLocation({
    profileId: activeProfile?.id,
    enabled: true, // Always enabled when profile is active
    onLocationUpdate: (location) => {
      console.log('[DistanceBetween] Live location updated:', location);
      loadStatus(); // Refresh status when location updates
    },
    onError: (error) => {
      console.error('[DistanceBetween] Live location error:', error);
      toast.error(error);
    },
  });

  const loadStatus = useCallback(async () => {
    try {
      console.log('[Location] Fetching location status from API...');
      const data = await fetchLocationStatus();
      console.log('[Location] Status received:', {
        partners: data.partners?.map(p => ({
          id: p.id,
          name: p.name,
          hasLocation: p.hasLocation,
          latitude: p.latitude,
          longitude: p.longitude,
          city: p.city
        })),
        distanceKm: data.distanceKm,
        formatted: data.formatted
      });
      setStatus(data);

      const now = Date.now();
      const canNotify = now - lastNotifyAtRef.current > 60_000;

      if (data.notifyNearby && canNotify) {
        lastNotifyAtRef.current = now;
        const msg = `You're within ${NEARBY_THRESHOLD_KM} km of each other! 💕`;
        toast.success(msg, 10000);
        setPulseNearby(true);
        window.setTimeout(() => setPulseNearby(false), 5000);
        pushNotification("So close together 💕", msg);
      } else if (data.notifyCloser && canNotify) {
        lastNotifyAtRef.current = now;
        const msg =
          data.formatted && data.distanceKm != null
            ? `You're ${data.closerByKm} km closer! Now ${data.formatted.value} ${data.formatted.unit} apart.`
            : `You're ${data.closerByKm} km closer than before!`;
        toast.success(msg, 8000);
        setPulseCloser(true);
        window.setTimeout(() => setPulseCloser(false), 4000);
        pushNotification("Closer together 💕", msg);
      }
    } catch (err) {
      setStatus(null);
      console.error("[Location] Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-start tracking when profile changes
  useEffect(() => {
    console.log('[DistanceBetween] Profile changed:', activeProfile?.name, activeProfile?.id);
    if (activeProfile && liveLocation.hasConsent) {
      console.log('[DistanceBetween] Profile has consent, starting tracking');
      liveLocation.startTracking().catch((err) => {
        console.error('[DistanceBetween] Failed to start tracking:', err);
      });
    }
  }, [activeProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for status updates
  useEffect(() => {
    loadStatus();
    const pollMs = liveLocation.isTracking && navigator.onLine ? 20_000 : 45_000;
    const interval = window.setInterval(loadStatus, pollMs);
    return () => window.clearInterval(interval);
  }, [loadStatus, liveLocation.isTracking]);

  // Reload when coming back online
  useEffect(() => {
    const onOnline = () => {
      loadStatus();
      if (liveLocation.hasConsent && activeProfile) {
        liveLocation.forceUpdate();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [liveLocation.hasConsent, activeProfile, loadStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const target = status?.distanceKm ?? 0;
    const start = displayDistance;
    const startTime = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayDistance(start + (target - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [status?.distanceKm]); // eslint-disable-line react-hooks/exhaustive-deps

  const withLoc = useMemo(
    () =>
      status?.partners?.filter(
        (p): p is PartnerLocation & { latitude: number; longitude: number } =>
          p.hasLocation && p.latitude != null && p.longitude != null
      ) ?? [],
    [status?.partners]
  );

  const locKey = useMemo(
    () => withLoc.map((p) => `${p.id}:${p.latitude?.toFixed(5)}:${p.longitude?.toFixed(5)}`).join("|"),
    [withLoc]
  );

  const bothReady = withLoc.length >= 2;
  const anyOnMap = withLoc.length >= 1;
  const isNearby = status?.nearby ?? (status?.distanceKm != null && status.distanceKm <= NEARBY_THRESHOLD_KM);

  useEffect(() => {
    if (!bothReady || withLoc.length < 2) {
      setTravel(null);
      return;
    }
    const [a, b] = withLoc;
    let cancelled = false;
    fetchTravelEstimate(a.latitude, a.longitude, b.latitude, b.longitude).then((est) => {
      if (!cancelled) setTravel(est);
    });
    return () => {
      cancelled = true;
    };
  }, [locKey, bothReady]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (withLoc.length === 0) {
      labelMarkerRef.current?.remove();
      labelMarkerRef.current = null;
      lineRef.current?.remove();
      lineRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
      return;
    }

    const centerLat = withLoc.reduce((s, p) => s + p.latitude, 0) / withLoc.length;
    const centerLng = withLoc.reduce((s, p) => s + p.longitude, 0) / withLoc.length;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([centerLat, centerLng], withLoc.length > 1 ? 5 : 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapRef.current);

      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    markersRef.current?.clearLayers();
    lineRef.current?.remove();
    lineRef.current = null;
    labelMarkerRef.current?.remove();
    labelMarkerRef.current = null;

    const latlngs: L.LatLngExpression[] = [];

    withLoc.forEach((p) => {
      const latlng: L.LatLngExpression = [p.latitude, p.longitude];
      latlngs.push(latlng);
      L.marker(latlng, { icon: createHeartIcon(p.color, p.name) }).addTo(markersRef.current!);
    });

    if (latlngs.length >= 2) {
      const highlight = isNearby;
      lineRef.current = L.polyline(latlngs, {
        color: highlight ? "#ff4d6d" : "#e50914",
        weight: highlight ? 5 : 3,
        opacity: highlight ? 1 : 0.85,
        dashArray: highlight ? undefined : "12 10",
        className: highlight ? "distance-polyline-near" : "distance-polyline-animated",
      }).addTo(mapRef.current!);

      const distLabel =
        status?.formatted && status.distanceKm != null
          ? `${status.formatted.value} ${status.formatted.unit}`
          : displayDistance < 1
            ? `${Math.round(displayDistance * 1000)} m`
            : `${Math.round(displayDistance * 10) / 10} km`;

      const [a, b] = latlngs as [L.LatLngTuple, L.LatLngTuple];
      const midLat = (a[0] + b[0]) / 2;
      const midLng = (a[1] + b[1]) / 2;
      labelMarkerRef.current = L.marker([midLat, midLng], {
        icon: createDistanceLabel(distLabel, highlight),
        interactive: false,
      }).addTo(mapRef.current!);

      mapRef.current!.fitBounds(L.latLngBounds(latlngs), { padding: [56, 56], maxZoom: highlight ? 14 : 12 });
    } else {
      mapRef.current!.setView(latlngs[0], 11);
    }

    window.setTimeout(() => mapRef.current?.invalidateSize(), 150);
  }, [locKey, isNearby, status?.formatted, status?.distanceKm, displayDistance]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const formatted =
    status?.formatted ??
    (displayDistance < 1
      ? { value: Math.round(displayDistance * 1000), unit: "m" as const }
      : { value: Math.round(displayDistance * 10) / 10, unit: "km" as const });

  const handleEnableLocation = async () => {
    if (!activeProfile) {
      toast.error("Choose your profile first (Who's watching?).");
      return;
    }

    // Request notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }

    // Start tracking with the hook
    try {
      await liveLocation.startTracking();
      toast.success(`GPS tracking enabled for ${activeProfile.name}`);
    } catch (err) {
      // Error already handled by the hook
      console.error('[DistanceBetween] Failed to enable location:', err);
    }
  };

  const handleForceUpdate = async () => {
    try {
      await liveLocation.forceUpdate();
      toast.success("Location updated from device GPS");
      await loadStatus();
    } catch (err) {
      // Error already handled by the hook
      console.error('[DistanceBetween] Force update failed:', err);
    }
  };

  const handleRefreshMap = async () => {
    setLoading(true);
    await loadStatus();
  };

  const pulse = pulseNearby || pulseCloser;

  // Determine the source label
  const lastShareSource = liveLocation.lastLocation
    ? liveLocation.lastLocation.source === "gps"
      ? `Device GPS (${Math.round(liveLocation.accuracy ?? 0)}m accuracy)`
      : "Network estimate (not GPS)"
    : null;

  return (
    <section className="py-24 px-6 lg:px-12 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, oklch(0.22 0.08 350 / 0.45) 0%, transparent 70%)",
        }}
      />

      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-primary/20 fill-primary/10 animate-pulse"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: 24 + (i % 3) * 12,
              height: 24 + (i % 3) * 12,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2.5 + i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto text-center">
        <Navigation
          className={`h-10 w-10 mx-auto text-primary ${pulse ? "animate-bounce" : ""}`}
        />
        <h2 className="font-display text-4xl md:text-5xl mt-5">Distance Between Us</h2>
        <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
          Each partner shares from their own device. We&apos;ll notify you when you&apos;re within{" "}
          <span className="text-foreground font-medium">{NEARBY_THRESHOLD_KM} km</span> of each other.
        </p>

        {gpsHint && (
          <p className="mt-3 text-xs text-amber-500/90 max-w-lg mx-auto text-left bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
            {gpsHint}
            {locationAccess.needsHttpsUpgrade && (
              <a
                href={locationAccess.secureUrl}
                className="mt-2 block font-medium text-amber-400 underline underline-offset-2"
              >
                Open {locationAccess.secureUrl}
              </a>
            )}
          </p>
        )}

        {gpsReadyHint && (
          <p className="mt-3 text-xs text-emerald-500/90 max-w-lg mx-auto text-center bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-4 py-2">
            {gpsReadyHint}
          </p>
        )}

        {locationAccess.canUseGps && (
          <p className="mt-3 text-xs text-muted-foreground max-w-md mx-auto">
            Uses your device GPS when you tap Share location. Each partner shares from their own phone.
          </p>
        )}

        {liveLocation.error && (
          <div className="mt-4 mx-auto max-w-md flex flex-col gap-3 text-left text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{liveLocation.error}</p>
            </div>
          </div>
        )}

        <div
          className={`mt-10 inline-block rounded-2xl border px-10 py-8 transition-all duration-500 ${
            pulse
              ? "border-primary shadow-[var(--shadow-glow)] scale-105 bg-primary/10"
              : "border-border/60 bg-card/50 backdrop-blur"
          }`}
        >
          {loading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          ) : bothReady && status?.distanceKm != null ? (
            <>
              <p className="font-display text-6xl md:text-7xl text-foreground tabular-nums">
                {formatted.value.toLocaleString()}
                <span className="text-3xl md:text-4xl ml-2 text-primary">{formatted.unit}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">apart right now</p>
              {isNearby && (
                <p className="text-xs text-primary mt-2 font-medium flex items-center justify-center gap-1">
                  <Heart className="h-3 w-3 fill-current" />
                  Within {NEARBY_THRESHOLD_KM} km — you&apos;re so close!
                </p>
              )}
              {status.previousDistanceKm != null &&
                status.previousDistanceKm > status.distanceKm &&
                !isNearby && (
                  <p className="text-xs text-emerald-500 mt-2 flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3 fill-current" />
                    {Math.round((status.previousDistanceKm - status.distanceKm) * 10) / 10} km closer
                    than last check
                  </p>
                )}
              {travel && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-primary" />
                    {travel.distanceKm} km by road
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    {formatTravelMinutes(travel.minutes)} to reach
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm max-w-xs">
              {withLoc.length === 1
                ? "One partner has shared location. Waiting for the other device."
                : "Both partners need to tap Share my location on their own phones."}
            </p>
          )}
        </div>

        {status?.partners && status.partners.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {status.partners.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left ${
                  p.hasLocation ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-display ${p.color}`}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {p.hasLocation
                      ? p.city || `${Number(p.latitude).toFixed(3)}, ${Number(p.longitude).toFixed(3)}`
                      : "Not shared yet"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {p.hasLocation && p.source === "gps" && "Device GPS · "}
                    {p.hasLocation && p.source === "network" && "Network estimate · "}
                    Updated {formatUpdated(p.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl overflow-hidden border border-border/60 shadow-[var(--shadow-card)] h-[280px] sm:h-[360px] bg-[#1a1a1a] relative">
          <div ref={mapContainerRef} className="w-full h-full z-[1]" />
          {!anyOnMap && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm z-[2] pointer-events-none">
              <p className="text-sm text-muted-foreground px-6 text-center">
                Map appears after at least one partner shares location from their device
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {activeProfile ? (
            <>
              {!liveLocation.isTracking ? (
                <button
                  type="button"
                  onClick={handleEnableLocation}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Satellite className="h-4 w-4" />
                  )}
                  Start GPS tracking as {activeProfile.name}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleForceUpdate}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Update my location now
                  </button>
                  <button
                    type="button"
                    onClick={() => liveLocation.stopTracking()}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-md border border-destructive/60 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Stop tracking
                  </button>
                </>
              )}
            </>
          ) : (
            <a
              href="/profiles"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium"
            >
              Choose profile first
            </a>
          )}

          <button
            type="button"
            onClick={handleRefreshMap}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-md border border-border/60 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh map
          </button>
        </div>

        {liveLocation.isTracking && lastShareSource && (
          <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
            <Bell className="h-3.5 w-3.5" />
            Last shared via {lastShareSource}
            {liveLocation.lastUpdate && (
              <span>· Updated {formatUpdated(liveLocation.lastUpdate.toISOString())}</span>
            )}
            {navigator.onLine ? " · live GPS when online" : " · waiting for connection"}
          </p>
        )}
      </div>

      <style>{`
        .distance-map-marker { background: transparent; border: none; }
        .distance-marker-pin {
          display: flex; flex-direction: column; align-items: center;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
        }
        .distance-marker-heart {
          font-size: 28px; color: var(--pin-color, #e50914); line-height: 1;
          animation: marker-pulse 2s ease-in-out infinite;
        }
        .distance-marker-label {
          font-size: 10px; font-weight: 600; color: white;
          background: rgba(0,0,0,0.75); padding: 2px 6px; border-radius: 4px;
          margin-top: 2px; white-space: nowrap;
        }
        .distance-map-label-wrap { background: transparent; border: none; }
        .distance-map-label {
          font-size: 12px; font-weight: 700; color: white;
          background: rgba(229, 9, 20, 0.92); padding: 6px 12px; border-radius: 999px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.45); white-space: nowrap;
          border: 2px solid rgba(255,255,255,0.25);
        }
        .distance-map-label--near {
          background: rgba(255, 77, 109, 0.95);
          animation: label-glow 1.5s ease-in-out infinite;
        }
        @keyframes label-glow {
          0%, 100% { box-shadow: 0 0 12px rgba(255,77,109,0.5); }
          50% { box-shadow: 0 0 24px rgba(255,77,109,0.9); }
        }
        @keyframes marker-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .distance-polyline-animated {
          animation: dash-flow 1.2s linear infinite;
        }
        .distance-polyline-near {
          filter: drop-shadow(0 0 6px rgba(255, 77, 109, 0.8));
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -22; }
        }
        .leaflet-container { background: #1a1a1a; font-family: inherit; }
      `}</style>
    </section>
  );
}
