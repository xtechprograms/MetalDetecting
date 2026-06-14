import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const FIND_CATEGORIES = [
  { value: "coin", label: "Coin", icon: "🪙" },
  { value: "relic", label: "Relic", icon: "⚔️" },
  { value: "jewelry", label: "Jewelry", icon: "💍" },
  { value: "artifact", label: "Artifact", icon: "🏺" },
  { value: "military", label: "Military", icon: "🎖️" },
  { value: "tool", label: "Tool / Hardware", icon: "🔧" },
  { value: "natural", label: "Natural / Mineral", icon: "💎" },
  { value: "other", label: "Other", icon: "✨" },
] as const;

export const DETECTOR_BRANDS = [
  "Minelab",
  "Garrett",
  "Nokta / Makro",
  "XP Deus",
  "Fisher",
  "Teknetics",
  "Whites",
  "Quest",
  "Bounty Hunter",
  "Other",
] as const;

export const DETECTOR_TYPES = [
  "VLF (Very Low Frequency)",
  "PI (Pulse Induction)",
  "Multi-Frequency",
  "Single-Frequency",
  "Pinpointer",
  "Beach / Underwater",
  "Relic / Deep Seeking",
  "Gold Prospecting",
  "General Purpose",
] as const;
