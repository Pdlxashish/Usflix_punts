/**
 * Admin panel — manage weather locations
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle, Check, MapPin, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface WeatherLocation {
  id: string;
  profileId: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
}

const BLANK = {
  profileId: null,
  locationName: "",
  latitude: 0,
  longitude: 0,
};

// Popular cities for quick add
const POPULAR_CITIES = [
  { name: "New York, NY", lat: 40.7128, lon: -74.0060 },
  { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { name: "Houston, TX", lat: 29.7604, lon: -95.3698 },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
  { name: "San Francisco, CA", lat: 37.7749, lon: -122.4194 },
  { name: "Boston, MA", lat: 42.3601, lon: -71.0589 },
];

export function WeatherAdmin() {
  const toast = useToast();
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<WeatherLocation[]>("/weather/locations");
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (loc: WeatherLocation) => {
    setEditingId(loc.id);
    setForm({
      profileId: loc.profileId,
      locationName: loc.locationName,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  };

  const save = async () => {
    if (!form.locationName.trim()) {
      setError("Location name is required.");
      return;
    }
    if (!form.latitude || !form.longitude) {
      setError("Valid coordinates are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/weather/locations/${editingId}`, form);
        toast.success("Location updated!");
      } else {
        await api.post("/weather/locations", form);
        toast.success("Location added!");
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save.");
      toast.error(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/weather/locations/${id}`);
      toast.success("Location deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const setPrimary = async (id: string) => {
    try {
      await api.patch(`/weather/locations/${id}/set-primary`, {});
      toast.success("Set as primary location!");
      await load();
    } catch {
      toast.error("Failed to set primary.");
    }
  };

  const useCity = (city: typeof POPULAR_CITIES[0]) => {
    setForm({
      ...form,
      locationName: city.name,
      latitude: city.lat,
      longitude: city.lon,
    });
  };

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <p className="text-sm text-foreground mb-2">
          <strong>Weather API Setup:</strong>
        </p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Get free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenWeatherMap</a></li>
          <li>Add to <code className="text-xs bg-muted px-1 py-0.5 rounded">backend/.env</code>: <code className="text-xs bg-muted px-1 py-0.5 rounded">OPENWEATHER_API_KEY=your_key</code></li>
          <li>Restart backend server</li>
          <li>Without API key, demo data will be shown</li>
        </ol>
      </div>

      {/* Form */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-4">
          {editingId ? "Edit Location" : "Add New Location"}
        </h3>

        {error && (
          <p className="text-sm text-destructive mb-3 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <div className="space-y-3">
          {/* Location name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Location Name *
            </label>
            <input
              value={form.locationName}
              onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
              placeholder="New York, NY"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Latitude *
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
                placeholder="40.7128"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Longitude *
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
                placeholder="-74.0060"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Quick city selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add popular cities:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city.name}
                  onClick={() => useCity(city)}
                  className="text-xs px-3 py-1.5 rounded-md bg-input hover:bg-card border border-border transition-colors"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? <><Check className="h-4 w-4" /> Save</> : <><Plus className="h-4 w-4" /> Add</>}
          </button>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-md text-sm hover:bg-card transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">
          {locations.length} location{locations.length !== 1 ? "s" : ""} configured
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No locations yet. Add your first location above.
          </p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={`flex items-center gap-3 bg-input/40 border rounded-lg px-3 py-3 ${
                  loc.isPrimary ? "border-primary/40" : "border-border/40"
                }`}
              >
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{loc.locationName}</p>
                    {loc.isPrimary && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        <Star className="h-3 w-3 fill-current" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!loc.isPrimary && (
                    <button
                      onClick={() => setPrimary(loc.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Set as primary"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(loc)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {deleteTarget === loc.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => remove(loc.id)}
                        className="text-xs text-destructive font-medium"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="text-xs text-muted-foreground"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget(loc.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
