/**
 * LocationMap
 * Display real-time GPS location of you and your partner on a map.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { MapPin, Navigation, Loader2, RefreshCw, Settings, Eye, EyeOff } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLinkStatus } from "@/context/link-status";
import { useWebSocketEvent } from "@/context/websocket";
import { useToast } from "@/components/ui/Toast";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  isRecent: boolean;
  minutesAgo: number;
}

interface DistanceData {
  kilometers: number;
  miles: number;
  formatted: string;
}

// Custom marker icons
function createMarkerIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "location-marker",
    html: `<div class="marker-pin" style="background: ${color}">
      <div class="marker-icon">📍</div>
      <div class="marker-label">${label}</div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

export function LocationMap() {
  const toast = useToast();
  const { getToken, isSignedIn } = useAuth();
  const { isLinked, partner } = useLinkStatus();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<LocationData | null>(null);
  const [distance, setDistance] = useState<DistanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Get user's location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation(position);
        setError(null);

        // Update marker
        if (mapRef.current) {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(coords);
          } else {
            userMarkerRef.current = L.marker(coords, {
              icon: createMarkerIcon("#3B82F6", "You"),
            }).addTo(mapRef.current);
          }

          // Center map on user location
          if (!partnerMarkerRef.current) {
            mapRef.current.setView(coords, 13);
          }
        }

        // Share location with backend
        if (sharingEnabled) {
          shareLocationWithBackend(position);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;
  }, [sharingEnabled]);

  // Share location with backend
  const shareLocationWithBackend = async (position: GeolocationPosition) => {
    if (!isSignedIn || !isLinked) return;

    try {
      const token = await getToken();
      await fetch(`${import.meta.env.VITE_API_URL}/api/location/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      });
    } catch (err) {
      console.error("Error sharing location:", err);
    }
  };

  // Fetch partner's location
  const fetchPartnerLocation = useCallback(async () => {
    if (!isSignedIn || !isLinked || !userLocation) return;

    setIsUpdating(true);

    try {
      const token = await getToken();
      const params = new URLSearchParams({
        includeDistance: "true",
        userLat: userLocation.coords.latitude.toString(),
        userLon: userLocation.coords.longitude.toString(),
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/location/partner?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.location) {
          setPartnerLocation(data.location);
          setDistance(data.distance);

          // Update partner marker
          if (mapRef.current) {
            const coords: [number, number] = [data.location.latitude, data.location.longitude];

            if (partnerMarkerRef.current) {
              partnerMarkerRef.current.setLatLng(coords);
            } else {
              partnerMarkerRef.current = L.marker(coords, {
                icon: createMarkerIcon("#EF4444", partner?.name || "Partner"),
              }).addTo(mapRef.current);
            }

            // Draw line between markers
            if (userLocation && lineRef.current) {
              lineRef.current.remove();
            }

            const userCoords: [number, number] = [
              userLocation.coords.latitude,
              userLocation.coords.longitude,
            ];

            lineRef.current = L.polyline([userCoords, coords], {
              color: "#8B5CF6",
              weight: 3,
              opacity: 0.6,
              dashArray: "10, 10",
            }).addTo(mapRef.current);

            // Fit map to show both markers
            const bounds = L.latLngBounds([userCoords, coords]);
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching partner location:", err);
    } finally {
      setIsUpdating(false);
      setIsLoading(false);
    }
  }, [isSignedIn, isLinked, userLocation, partner, getToken]);

  // Toggle location sharing
  const toggleSharing = async () => {
    try {
      const token = await getToken();
      const newState = !sharingEnabled;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/location/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: newState }),
      });

      if (response.ok) {
        setSharingEnabled(newState);
        toast.success(newState ? "Location sharing enabled" : "Location sharing disabled");
      }
    } catch (err) {
      console.error("Error toggling location sharing:", err);
      toast.error("Failed to update settings");
    }
  };

  // Start watching location
  useEffect(() => {
    if (isLinked) {
      getUserLocation();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isLinked, getUserLocation]);

  // Fetch partner location periodically
  useEffect(() => {
    if (!isLinked || !userLocation) return;

    fetchPartnerLocation();
    const interval = setInterval(fetchPartnerLocation, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isLinked, userLocation, fetchPartnerLocation]);

  // Listen for partner location updates via WebSocket
  useWebSocketEvent("location:update", useCallback(() => {
    fetchPartnerLocation();
  }, [fetchPartnerLocation]));

  if (!isLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-muted/30 rounded-xl p-8">
        <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Partner Linked</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Link with your partner to see each other's location in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Location</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time location with {partner?.name || "your partner"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPartnerLocation}
            disabled={isUpdating}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={toggleSharing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${
              sharingEnabled
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {sharingEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {sharingEnabled ? "Sharing On" : "Sharing Off"}
          </button>
        </div>
      </div>

      {/* Distance Card */}
      {distance && (
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{distance.formatted}</p>
                <p className="text-xs text-muted-foreground">
                  {distance.miles.toFixed(2)} miles apart
                </p>
              </div>
            </div>
            {partnerLocation && (
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {partnerLocation.isRecent ? "Live" : "Last seen"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {partnerLocation.minutesAgo < 1
                    ? "just now"
                    : `${partnerLocation.minutesAgo}m ago`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Map Container */}
      <div className="relative h-[500px] rounded-xl overflow-hidden border-2 border-border shadow-lg">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Styles */}
      <style>{`
        .location-marker { background: transparent; border: none; }
        .marker-pin {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .marker-icon {
          transform: rotate(45deg);
          font-size: 20px;
        }
        .marker-label {
          position: absolute;
          top: 45px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
