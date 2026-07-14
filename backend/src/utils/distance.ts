/**
 * Distance Calculation Utility
 * Calculate distance between two GPS coordinates using the Haversine formula.
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Distance {
  kilometers: number;
  miles: number;
  meters: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * 
 * @param point1 First coordinate
 * @param point2 Second coordinate
 * @returns Distance in kilometers, miles, and meters
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): Distance {
  // Earth's radius in kilometers
  const EARTH_RADIUS_KM = 6371;

  // Handle same location case
  if (
    point1.latitude === point2.latitude &&
    point1.longitude === point2.longitude
  ) {
    return {
      kilometers: 0,
      miles: 0,
      meters: 0,
    };
  }

  // Convert to radians
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Calculate distance
  const kilometers = EARTH_RADIUS_KM * c;
  const miles = kilometers * 0.621371; // 1 km = 0.621371 miles
  const meters = kilometers * 1000;

  return {
    kilometers: Math.round(kilometers * 100) / 100, // Round to 2 decimal places
    miles: Math.round(miles * 100) / 100,
    meters: Math.round(meters),
  };
}

/**
 * Format distance to human-readable string
 * 
 * @param distance Distance object
 * @param unit Unit to use ('km' or 'mi')
 * @returns Formatted string (e.g., "2.5 km" or "1.6 mi")
 */
export function formatDistance(distance: Distance, unit: "km" | "mi" = "km"): string {
  if (unit === "mi") {
    if (distance.miles < 0.1) {
      return `${distance.meters} m`;
    }
    return `${distance.miles} mi`;
  }

  if (distance.kilometers < 0.1) {
    return `${distance.meters} m`;
  }
  if (distance.kilometers < 1) {
    return `${Math.round(distance.meters)} m`;
  }
  return `${distance.kilometers} km`;
}

/**
 * Check if two locations are within a certain radius
 * 
 * @param point1 First coordinate
 * @param point2 Second coordinate
 * @param radiusKm Radius in kilometers
 * @returns True if locations are within radius
 */
export function isWithinRadius(
  point1: Coordinates,
  point2: Coordinates,
  radiusKm: number
): boolean {
  const distance = calculateDistance(point1, point2);
  return distance.kilometers <= radiusKm;
}

/**
 * Calculate bearing (direction) between two points
 * Returns angle in degrees (0-360) where 0 is North
 * 
 * @param point1 Starting coordinate
 * @param point2 Destination coordinate
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(point1: Coordinates, point2: Coordinates): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return Math.round(bearing);
}

/**
 * Get compass direction from bearing
 * 
 * @param bearing Bearing in degrees (0-360)
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassDirection(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
