export type UnitSystem = "metric" | "imperial";

export const UNIT_STORAGE_KEY = "treasure-atlas-units";

export const RADIUS_PRESETS: Record<UnitSystem, number[]> = {
  metric: [5, 10, 25, 50],
  imperial: [5, 10, 25, 50],
};

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

export function kmToMiles(km: number): number {
  return km / 1.60934;
}

export function parseRadiusToKm(value: number, unit: UnitSystem): number {
  return unit === "imperial" ? milesToKm(value) : value;
}

export function formatDistance(km: number, unit: UnitSystem): string {
  if (unit === "imperial") {
    const miles = kmToMiles(km);
    if (miles < 0.1) return `${Math.round(miles * 5280)} ft away`;
    return `${miles.toFixed(1)} mi away`;
  }
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatRadiusLabel(value: number, unit: UnitSystem): string {
  return unit === "imperial" ? `${value} mi` : `${value} km`;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function readStoredUnitSystem(): UnitSystem {
  if (typeof window === "undefined") return "imperial";
  const saved = localStorage.getItem(UNIT_STORAGE_KEY);
  return saved === "metric" || saved === "imperial" ? saved : "imperial";
}

export function storeUnitSystem(unit: UnitSystem): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UNIT_STORAGE_KEY, unit);
}
