"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Find } from "@/types/database";
import { Loader2 } from "lucide-react";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[220px] flex items-center justify-center bg-slate-900/50 rounded-xl">
      <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
    </div>
  ),
});

export const MAP_SIZE_CLASSES = {
  sm: "h-[min(45vh,280px)] min-h-[220px] sm:h-[320px]",
  md: "h-[min(50vh,320px)] min-h-[240px] sm:h-[400px] md:h-[450px]",
  lg: "h-[min(55vh,340px)] min-h-[260px] sm:h-[480px] md:h-[550px] lg:h-[600px]",
} as const;

export type MapSize = keyof typeof MAP_SIZE_CLASSES;

type MapProps = {
  finds?: Find[];
  center?: [number, number];
  zoom?: number;
  size?: MapSize;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectable?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
  radiusKm?: number | null;
  historyMarkers?: { id: string; lat: number; lng: number; title: string; label?: string }[];
  onHistoryMarkerClick?: (id: string) => void;
};

export function DetectingMap({
  finds = [],
  center = [20, 0],
  zoom = 2,
  size = "md",
  onLocationSelect,
  selectable = false,
  selectedLocation = null,
  radiusKm = null,
  historyMarkers = [],
  onHistoryMarkerClick,
}: MapProps) {
  const [mounted, setMounted] = useState(false);
  const heightClass = MAP_SIZE_CLASSES[size];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 ${heightClass}`}
      >
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40 ${heightClass}`}
    >
      <MapInner
        finds={finds}
        center={center}
        zoom={zoom}
        onLocationSelect={onLocationSelect}
        selectable={selectable}
        selectedLocation={selectedLocation}
        radiusKm={radiusKm}
        historyMarkers={historyMarkers}
        onHistoryMarkerClick={onHistoryMarkerClick}
      />
    </div>
  );
}
