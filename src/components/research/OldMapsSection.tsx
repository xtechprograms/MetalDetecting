"use client";

import { useEffect, useRef, useState } from "react";
import type { OldMapRecord } from "@/types/database";
import {
  X,
  Download,
  Map,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function MapCard({
  map,
  onClick,
  compact = false,
}: {
  map: OldMapRecord;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass-card overflow-hidden text-left hover:border-gold-500/30 transition-all group shrink-0 snap-start ${
        compact ? "w-[220px] sm:w-[240px]" : "w-full"
      }`}
    >
      <div className={`${compact ? "h-32" : "aspect-[4/3]"} bg-slate-900/80 relative overflow-hidden`}>
        {map.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={map.thumbnailUrl}
            alt={map.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Map className="w-8 h-8 text-slate-600" />
          </div>
        )}
        {map.year > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-bold text-gold-400 border border-gold-500/30">
            {map.year}
          </span>
        )}
      </div>
      <div className={compact ? "p-3" : "p-4"}>
        <h4 className="font-semibold text-sm text-slate-100 line-clamp-1">{map.title}</h4>
        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
          {map.scaleLabel} · {map.series}
        </p>
      </div>
    </button>
  );
}

function ResourceCard({
  resource,
  onClick,
}: {
  resource: OldMapRecord;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card p-4 text-left hover:border-gold-500/30 transition-all shrink-0 snap-start w-[220px] sm:w-[260px] min-h-[120px] flex flex-col"
    >
      <h4 className="font-semibold text-sm text-slate-100">{resource.title}</h4>
      <p className="text-xs text-slate-500 mt-2 line-clamp-3 flex-1">{resource.description}</p>
      <p className="text-[11px] text-gold-500/80 mt-2">Tap for details</p>
    </button>
  );
}

function HorizontalScrollRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children]);

  function scrollBy(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.75, 240);
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {label && (
        <p className="text-xs text-slate-500 mb-2 px-1">{label}</p>
      )}
      <div className="relative group/scroll">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy("left")}
            aria-label="Scroll maps left"
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-slate-950/90 border border-slate-700 text-slate-200 shadow-lg hover:border-gold-500/40 -ml-3"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy("right")}
            aria-label="Scroll maps right"
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-slate-950/90 border border-slate-700 text-slate-200 shadow-lg hover:border-gold-500/40 -mr-3"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth touch-pan-x theme-scrollbar"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function MapDetailModal({
  map,
  open,
  onClose,
}: {
  map: OldMapRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !map) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close map details"
      />
      <div className="relative w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto bg-slate-950 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold gold-gradient-text">{map.title}</h3>
            <p className="text-sm text-slate-400 mt-1">
              {map.year > 0 ? `${map.year} · ` : ""}
              {map.scaleLabel}
              {map.state ? ` · ${map.state}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost min-h-11 min-w-11 p-2 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {map.previewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={map.previewUrl}
                alt={`Preview of ${map.title}`}
                className="w-full max-h-[360px] object-contain bg-slate-900"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = "none";
                }}
              />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Why this map matters</h4>
            <p className="text-sm text-slate-400 leading-relaxed">{map.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {map.downloadUrl && (
              <a
                href={map.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                <Download className="w-4 h-4" />
                Download GeoPDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OldMapsSection({
  maps,
  resources,
  loading,
  locationLabel,
}: {
  maps: OldMapRecord[];
  resources: OldMapRecord[];
  loading: boolean;
  locationLabel: string;
}) {
  const [selectedMap, setSelectedMap] = useState<OldMapRecord | null>(null);

  if (loading) {
    return (
      <div className="glass-card p-6 text-center">
        <Loader2 className="w-6 h-6 text-gold-500 animate-spin mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Loading historical maps for {locationLabel}...</p>
      </div>
    );
  }

  if (maps.length === 0 && resources.length === 0) return null;

  return (
    <>
      <div className="glass-card p-4 sm:p-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-lg font-bold gold-gradient-text flex items-center gap-2">
              <Map className="w-5 h-5 shrink-0" />
              Historical Maps
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {locationLabel} · scroll sideways to browse · tap a map for details
            </p>
          </div>
          {maps.length > 0 && (
            <span className="text-xs text-slate-500 shrink-0">{maps.length} USGS sheets</span>
          )}
        </div>

        {maps.length > 0 ? (
          <HorizontalScrollRow>
            {maps.map((map) => (
              <MapCard key={map.id} map={map} compact onClick={() => setSelectedMap(map)} />
            ))}
          </HorizontalScrollRow>
        ) : (
          <p className="text-sm text-slate-400 mb-4">
            No USGS scanned topos at this point — browse archives below.
          </p>
        )}

        {resources.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/60">
            <HorizontalScrollRow label="More map archives">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onClick={() => setSelectedMap(resource)}
                />
              ))}
            </HorizontalScrollRow>
          </div>
        )}
      </div>

      <MapDetailModal
        map={selectedMap}
        open={selectedMap != null}
        onClose={() => setSelectedMap(null)}
      />
    </>
  );
}
