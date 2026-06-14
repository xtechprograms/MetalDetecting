"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Find } from "@/types/database";
import { Loader2 } from "lucide-react";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-xl">
      <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
    </div>
  ),
});

type MapProps = {
  finds?: Find[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectable?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
};

export function DetectingMap({
  finds = [],
  center = [20, 0],
  zoom = 2,
  height = "500px",
  onLocationSelect,
  selectable = false,
  selectedLocation = null,
}: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50"
        style={{ height }}
      >
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40">
      <MapInner
        finds={finds}
        center={center}
        zoom={zoom}
        height={height}
        onLocationSelect={onLocationSelect}
        selectable={selectable}
        selectedLocation={selectedLocation}
      />
    </div>
  );
}
