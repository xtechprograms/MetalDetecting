"use client";

import { useState } from "react";
import { DetectingMap } from "@/components/map/DetectingMap";
import type { AreaHistory } from "@/types/database";
import {
  Search,
  MapPin,
  Crosshair,
  Loader2,
  Lightbulb,
  Scale,
  History,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import { formatCoordinates } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function ResearchPanel() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AreaHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  async function researchLocation(researchLat: number, researchLng: number) {
    setLoading(true);
    setError(null);
    setLat(researchLat);
    setLng(researchLng);
    setBookmarked(false);

    try {
      const res = await fetch(
        `/api/research?lat=${researchLat}&lng=${researchLng}`
      );
      if (!res.ok) throw new Error("Failed to fetch area history");
      const data: AreaHistory = await res.json();
      setHistory(data);
    } catch {
      setError("Unable to research this location. Please try again.");
    }
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "User-Agent": "TreasureAtlas/1.0" } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setError("Location not found. Try a different search.");
        setLoading(false);
        return;
      }
      await researchLocation(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch {
      setError("Search failed. Please try again.");
      setLoading(false);
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        researchLocation(pos.coords.latitude, pos.coords.longitude);
        setGettingLocation(false);
      },
      () => {
        setError("Unable to get location");
        setGettingLocation(false);
      }
    );
  }

  function handleMapClick(mapLat: number, mapLng: number) {
    researchLocation(mapLat, mapLng);
  }

  async function bookmarkSite() {
    if (!history || lat == null || lng == null) return;
    setBookmarking(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sign in to save research bookmarks");
      setBookmarking(false);
      return;
    }

    await supabase.from("research_bookmarks").insert({
      user_id: user.id,
      place_name: history.placeName,
      latitude: lat,
      longitude: lng,
      history_summary: history.summary,
    });

    setBookmarked(true);
    setBookmarking(false);
  }

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="glass-card p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              className="input-field pl-11"
              placeholder="Search any location worldwide... e.g. York, England"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto shrink-0" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Research"}
          </button>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="btn-secondary w-full sm:w-auto shrink-0"
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            My Location
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          Or click anywhere on the map below to research that area
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Map */}
      <DetectingMap
        center={lat != null && lng != null ? [lat, lng] : [30, 0]}
        zoom={lat != null ? 10 : 2}
        size="md"
        selectable
        onLocationSelect={handleMapClick}
        selectedLocation={lat != null && lng != null ? { lat, lng } : null}
      />

      {/* Results */}
      {loading && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Researching area history...</p>
        </div>
      )}

      {history && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold gold-gradient-text">
                  {history.placeName}
                </h2>
                <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {formatCoordinates(history.coordinates.lat, history.coordinates.lng)}
                </p>
              </div>
              <button
                onClick={bookmarkSite}
                className="btn-secondary text-sm"
                disabled={bookmarking || bookmarked}
              >
                {bookmarking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                {bookmarked ? "Saved!" : "Save Research"}
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">{history.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-gold-400" />
                Historical Context
              </h3>
              <ul className="space-y-3">
                {history.historicalEvents.map((event, i) => (
                  <li key={i} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-gold-500 shrink-0">•</span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-gold-400" />
                Detecting Tips
              </h3>
              <ul className="space-y-3">
                {history.detectingTips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-gold-500 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass-card p-6 border-amber-700/30">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-amber-400" />
              Legal & Permissions
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {history.landPermissions}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
