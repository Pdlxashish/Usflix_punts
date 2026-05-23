/**
 * Weather Widget — Auto-detects each partner's GPS location and shows live weather.
 * When a profile is active, it silently shares that user's location and fetches weather.
 * Both partners' weather cards are shown side by side.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Cloud, Droplets, Wind, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { useProfile } from "@/context/profile";

interface WeatherLocation {
  id: string;
  profileId: string | null;
  profileName?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
  weather: {
    temp: number;
    feelsLike: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    isMock: boolean;
  };
}

function WeatherCard({ location }: { location: WeatherLocation }) {
  const { weather } = location;
  const iconUrl = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  const displayName = location.profileName || location.locationName;

  return (
    <div
      className={`relative bg-card/60 border rounded-xl p-6 transition-all hover:shadow-[var(--shadow-glow)] ${
        location.isPrimary ? "border-primary/60" : "border-border/40"
      }`}
    >
      {location.isPrimary && (
        <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium shadow-lg">
          My Location
        </div>
      )}

      {/* Profile name / location */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <div>
          <h3 className="font-medium text-lg leading-tight">{displayName}</h3>
          {location.profileName && location.locationName !== location.profileName && (
            <p className="text-xs text-muted-foreground">{location.locationName}</p>
          )}
        </div>
      </div>

      {/* Temperature and icon */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-4xl sm:text-5xl font-bold">{weather.temp}°C</div>
          <p className="text-sm text-muted-foreground capitalize mt-1">
            {weather.description}
          </p>
        </div>
        <img
          src={iconUrl}
          alt={weather.description}
          className="w-16 h-16 sm:w-20 sm:h-20"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Feels Like</div>
          <div className="text-sm font-medium">{weather.feelsLike}°C</div>
        </div>
        <div className="text-center">
          <Droplets className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
          <div className="text-sm font-medium">{weather.humidity}%</div>
        </div>
        <div className="text-center">
          <Wind className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
          <div className="text-sm font-medium">{weather.windSpeed} m/s</div>
        </div>
      </div>

      {weather.isMock && (
        <p className="text-xs text-muted-foreground italic mt-3 text-center">
          Demo data — add OpenWeatherMap API key for live weather
        </p>
      )}
    </div>
  );
}

/** Silently get device GPS coords */
function getDeviceCoords(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/** Reverse-geocode lat/lng to a city name using OpenStreetMap Nominatim */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      data.display_name?.split(",")[0] ||
      `${lat.toFixed(2)}, ${lon.toFixed(2)}`
    );
  } catch {
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

export function WeatherWidget() {
  const { activeProfile, profiles } = useProfile();
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const autoSharedRef = useRef(false);

  /** Push current user's GPS to the backend weather location, then reload */
  const shareAndLoad = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);

    // Try to get GPS and update this profile's weather location
    if (activeProfile) {
      try {
        const coords = await getDeviceCoords();
        const city = await reverseGeocode(coords.latitude, coords.longitude);
        // Upsert this profile's weather location
        await fetchApiJson("/weather/auto-location", {
          method: "POST",
          body: JSON.stringify({
            profileId: activeProfile.id,
            profileName: activeProfile.name,
            latitude: coords.latitude,
            longitude: coords.longitude,
            locationName: city,
          }),
        });
        if (!silent) setLocationStatus(`Updated: ${city}`);
      } catch {
        // GPS denied or unavailable — just load existing data
        if (!silent) setLocationStatus("Location unavailable — showing saved data");
      }
    }

    // Fetch all weather locations (both partners)
    try {
      const data = await fetchApiJson<WeatherLocation[]>("/weather/current");
      // Enrich with profile names
      const enriched = data.map((loc) => {
        if (loc.profileId) {
          const profile = profiles.find((p) => p.id === loc.profileId);
          if (profile) return { ...loc, profileName: profile.name };
        }
        return loc;
      });
      // One card per profile (guard against duplicate DB rows)
      const byProfile = new Map<string, WeatherLocation>();
      const extras: WeatherLocation[] = [];
      for (const loc of enriched) {
        if (!loc.profileId) {
          extras.push(loc);
          continue;
        }
        const prev = byProfile.get(loc.profileId);
        if (!prev || (loc.isPrimary && !prev.isPrimary)) {
          byProfile.set(loc.profileId, loc);
        }
      }
      setLocations([...byProfile.values(), ...extras]);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeProfile, profiles]);

  // Auto-share location once when component mounts or profile changes
  useEffect(() => {
    autoSharedRef.current = false;
  }, [activeProfile?.id]);

  useEffect(() => {
    if (!autoSharedRef.current) {
      autoSharedRef.current = true;
      shareAndLoad(true);
    }
    // Refresh every 10 minutes
    const interval = setInterval(() => shareAndLoad(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [shareAndLoad]);

  const handleRefresh = () => {
    setRefreshing(true);
    shareAndLoad(false);
  };

  if (!loading && locations.length === 0) return null;

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, oklch(0.2 0.07 200 / 0.4) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5" /> Weather
            </p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4">
            Where <span className="text-primary italic">We Are</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Live weather at each partner's location
          </p>
        </div>

        {/* Refresh button */}
        <div className="flex justify-center mb-6 flex-col items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshing ? "Updating location..." : "Refresh Weather"}
          </button>
          {locationStatus && (
            <p className="text-xs text-muted-foreground">{locationStatus}</p>
          )}
        </div>

        {/* Weather cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((location) => (
              <WeatherCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
