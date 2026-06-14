"use client";

import { useEffect } from "react";
import type { AreaHistory, NearbyHistorySite } from "@/types/database";
import {
  X,
  MapPin,
  History,
  Lightbulb,
  Scale,
  Loader2,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import { formatCoordinates } from "@/lib/utils";
import { formatDistance, type UnitSystem } from "@/lib/geo";

type Props = {
  open: boolean;
  onClose: () => void;
  site: NearbyHistorySite | null;
  history: AreaHistory | null;
  loading: boolean;
  unitSystem: UnitSystem;
  onBookmark?: () => void;
  bookmarking?: boolean;
  bookmarked?: boolean;
};

export function HistoryDetailModal({
  open,
  onClose,
  site,
  history,
  loading,
  unitSystem,
  onBookmark,
  bookmarking = false,
  bookmarked = false,
}: Props) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close history details"
      />

      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto bg-slate-950 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            {site && (
              <>
                <p className="text-xs text-gold-500 font-semibold uppercase tracking-wide mb-1">
                  {formatDistance(site.distanceKm, unitSystem)}
                </p>
                <h2
                  id="history-modal-title"
                  className="font-display text-xl sm:text-2xl font-bold gold-gradient-text truncate"
                >
                  {site.title}
                </h2>
                <p className="text-sm text-slate-400 mt-1 truncate">{site.placeName}</p>
              </>
            )}
            {!site && history && (
              <h2
                id="history-modal-title"
                className="font-display text-xl sm:text-2xl font-bold gold-gradient-text"
              >
                {history.placeName}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onBookmark && history && !loading && (
              <button
                type="button"
                onClick={onBookmark}
                disabled={bookmarking || bookmarked}
                className="btn-secondary text-sm min-h-[44px]"
              >
                {bookmarking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                {bookmarked ? "Saved" : "Save"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost min-h-11 min-w-11 p-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {loading && (
            <div className="py-16 text-center">
              <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Loading area history...</p>
            </div>
          )}

          {!loading && history && (
            <>
              <div>
                <p className="text-sm text-slate-400 flex items-center gap-1 mb-3">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {formatCoordinates(history.coordinates.lat, history.coordinates.lng)}
                </p>
                <p className="text-slate-300 leading-relaxed">{history.summary}</p>
                {site?.wikipediaUrl && (
                  <a
                    href={site.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gold-400 hover:underline mt-3"
                  >
                    Read more on Wikipedia <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-gold-400" />
                  Historical Context
                </h3>
                <ul className="space-y-2">
                  {history.historicalEvents.map((event, i) => (
                    <li key={i} className="text-sm text-slate-400 flex gap-2">
                      <span className="text-gold-500 shrink-0">•</span>
                      {event}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-gold-400" />
                  Detecting Tips
                </h3>
                <ul className="space-y-2">
                  {history.detectingTips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-400 flex gap-2">
                      <span className="text-gold-500 shrink-0">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
                <h3 className="font-display text-base font-semibold flex items-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  Legal & Permissions
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{history.landPermissions}</p>
              </div>
            </>
          )}

          {!loading && !history && (
            <p className="text-center text-slate-400 py-8 text-sm">
              Unable to load history for this location.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
