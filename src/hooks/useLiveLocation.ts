/**
 * useLiveLocation Hook
 * 
 * Manages real-time device GPS location tracking with:
 * - Continuous watchPosition monitoring
 * - Smart debouncing (time + distance thresholds)
 * - Automatic background updates when enabled
 * - Privacy controls (toggleable on/off)
 * - Error handling and user feedback
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveDeviceLocation,
  startLocationWatch,
  shareProfileLocation,
  setLocationConsent,
  hasLocationConsent,
  type ResolvedLocation,
} from "@/lib/partnerLocation";

export interface UseLiveLocationOptions {
  profileId?: string;
  enabled?: boolean;
  onLocationUpdate?: (location: ResolvedLocation) => void;
  onError?: (error: string) => void;
}

export interface UseLiveLocationResult {
  isTracking: boolean;
  lastLocation: ResolvedLocation | null;
  lastUpdate: Date | null;
  error: string | null;
  accuracy: number | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  forceUpdate: () => Promise<void>;
  hasConsent: boolean;
}

/**
 * Hook for managing live GPS location tracking
 * 
 * @example
 * ```tsx
 * const {
 *   isTracking,
 *   lastLocation,
 *   startTracking,
 *   stopTracking,
 *   forceUpdate
 * } = useLiveLocation({
 *   profileId: activeProfile?.id,
 *   enabled: locationSharingEnabled,
 *   onLocationUpdate: (loc) => console.log('New location:', loc),
 *   onError: (err) => toast.error(err)
 * });
 * ```
 */
export function useLiveLocation(options: UseLiveLocationOptions = {}): UseLiveLocationResult {
  const { profileId, enabled = false, onLocationUpdate, onError } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<ResolvedLocation | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [hasConsent, setHasConsent] = useState(() => 
    profileId ? hasLocationConsent(profileId) : false
  );

  const stopWatchRef = useRef<(() => void) | null>(null);
  const isUpdatingRef = useRef(false);

  /**
   * Handle location updates from the watch
   */
  const handleLocationUpdate = useCallback(
    async (location: ResolvedLocation) => {
      if (!profileId || isUpdatingRef.current) return;

      console.log('[useLiveLocation] Received location update:', location);

      try {
        isUpdatingRef.current = true;
        
        // Share location with backend
        await shareProfileLocation(profileId, location);
        
        // Update local state
        setLastLocation(location);
        setLastUpdate(new Date());
        setAccuracy(location.accuracy ?? null);
        setError(null);
        
        // Call user callback
        onLocationUpdate?.(location);
        
        console.log('[useLiveLocation] Location shared successfully');
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to share location";
        console.error('[useLiveLocation] Failed to share location:', err);
        setError(message);
        onError?.(message);
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [profileId, onLocationUpdate, onError]
  );

  /**
   * Handle geolocation errors
   */
  const handleError = useCallback(
    (message: string) => {
      console.error('[useLiveLocation] Geolocation error:', message);
      setError(message);
      onError?.(message);
    },
    [onError]
  );

  /**
   * Start tracking device GPS location
   */
  const startTracking = useCallback(async () => {
    if (!profileId) {
      const msg = "No profile selected";
      setError(msg);
      onError?.(msg);
      return;
    }

    if (isTracking) {
      console.log('[useLiveLocation] Already tracking');
      return;
    }

    console.log('[useLiveLocation] Starting location tracking for profile:', profileId);

    try {
      setError(null);
      
      // Get initial location
      const initialLocation = await resolveDeviceLocation({
        allowNetworkFallback: false,
      });
      
      console.log('[useLiveLocation] Got initial location:', initialLocation);
      
      // Share initial location
      await shareProfileLocation(profileId, initialLocation);
      
      // Update state
      setLastLocation(initialLocation);
      setLastUpdate(new Date());
      setAccuracy(initialLocation.accuracy ?? null);
      setLocationConsent(true, profileId);
      setHasConsent(true);
      
      // Start continuous watch
      stopWatchRef.current = startLocationWatch(
        handleLocationUpdate,
        handleError
      );
      
      setIsTracking(true);
      onLocationUpdate?.(initialLocation);
      
      console.log('[useLiveLocation] Tracking started successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start tracking";
      console.error('[useLiveLocation] Failed to start tracking:', err);
      setError(message);
      setLocationConsent(false, profileId);
      setHasConsent(false);
      onError?.(message);
      throw err;
    }
  }, [profileId, isTracking, handleLocationUpdate, handleError, onLocationUpdate, onError]);

  /**
   * Stop tracking device GPS location
   */
  const stopTracking = useCallback(() => {
    console.log('[useLiveLocation] Stopping location tracking');
    
    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }
    
    setIsTracking(false);
    
    if (profileId) {
      setLocationConsent(false, profileId);
      setHasConsent(false);
    }
  }, [profileId]);

  /**
   * Force an immediate location update
   */
  const forceUpdate = useCallback(async () => {
    if (!profileId) {
      const msg = "No profile selected";
      setError(msg);
      onError?.(msg);
      return;
    }

    console.log('[useLiveLocation] Forcing location update');

    try {
      setError(null);
      
      const location = await resolveDeviceLocation({
        allowNetworkFallback: false,
      });
      
      await shareProfileLocation(profileId, location);
      
      setLastLocation(location);
      setLastUpdate(new Date());
      setAccuracy(location.accuracy ?? null);
      
      onLocationUpdate?.(location);
      
      console.log('[useLiveLocation] Force update successful');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update location";
      console.error('[useLiveLocation] Force update failed:', err);
      setError(message);
      onError?.(message);
    }
  }, [profileId, onLocationUpdate, onError]);

  /**
   * Auto-start tracking when enabled changes
   */
  useEffect(() => {
    if (enabled && profileId && !isTracking && hasConsent) {
      console.log('[useLiveLocation] Auto-starting due to enabled=true and has consent');
      startTracking().catch((err) => {
        console.error('[useLiveLocation] Auto-start failed:', err);
      });
    } else if (!enabled && isTracking) {
      console.log('[useLiveLocation] Auto-stopping due to enabled=false');
      stopTracking();
    }
  }, [enabled, profileId, isTracking, hasConsent]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (stopWatchRef.current) {
        console.log('[useLiveLocation] Cleaning up on unmount');
        stopWatchRef.current();
        stopWatchRef.current = null;
      }
    };
  }, []);

  /**
   * Update consent state when profile changes
   */
  useEffect(() => {
    if (profileId) {
      const consent = hasLocationConsent(profileId);
      setHasConsent(consent);
      console.log('[useLiveLocation] Profile consent status:', { profileId, consent });
    } else {
      setHasConsent(false);
    }
  }, [profileId]);

  return {
    isTracking,
    lastLocation,
    lastUpdate,
    error,
    accuracy,
    startTracking,
    stopTracking,
    forceUpdate,
    hasConsent,
  };
}
