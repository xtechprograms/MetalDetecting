"use client";

import { useEffect, useState } from "react";
import type { OldMapRecord } from "@/types/database";
import { X, Download, ExternalLink, Map, Loader2 } from "lucide-react";

function MapCard({
  map,
  onClick,
}: {
  map: OldMapRecord;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card overflow-hidden text-left hover:border-gold-500/30 transition-all group w-full"
    >
      <div className="aspect-[4/3] bg-slate-900/80 relative overflow-hidden">
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
            <Map className="w-10 h-10 text-slate-600" />
          </div>
        )}
        {map.year > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-xs font-bold text-gold-400 border border-gold-500/30">
            {map.year}
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-slate-100 line-clamp-1">{map.title}</h4>
        <p className="text-xs text-slate-500 mt-1">
          {map.scaleLabel} · {map.series}
        </p>
        <p className="text-xs text-gold-500/80 mt-2">Click for map details</p>
      </div>
    </button>
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
            <a
              href={map.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in map viewer
            </a>
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
      <div className="glass-card p-10 text-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading historical maps for {locationLabel}...</p>
      </div>
    );
  }

  if (maps.length === 0 && resources.length === 0) return null;

  return (
    <>
      <div className="space-y-4 animate-fade-in">
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold gold-gradient-text flex items-center gap-2 mb-1">
            <Map className="w-5 h-5" />
            Historical Maps
          </h2>
          <p className="text-sm text-slate-400">
            Old topographic sheets for {locationLabel} — compare past roads, buildings, and land use
            before you detect.
          </p>
        </div>

        {maps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((map) => (
              <MapCard key={map.id} map={map} onClick={() => setSelectedMap(map)} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-sm text-slate-400">
            No USGS scanned topos were found at this exact point. Use the resources below to browse
            historical maps for your area.
          </div>
        )}

        {resources.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 px-1">More map archives</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => setSelectedMap(resource)}
                  className="glass-card p-4 text-left hover:border-gold-500/30 transition-all"
                >
                  <h4 className="font-semibold text-slate-100">{resource.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{resource.description}</p>
                  <p className="text-xs text-gold-500/80 mt-2">Click for details</p>
                </button>
              ))}
            </div>
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