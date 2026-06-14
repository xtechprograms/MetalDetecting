"use client";

import { useEffect, useState } from "react";
import { DetectingMap } from "@/components/map/DetectingMap";
import type { AreaHistory, NearbyHistoryResult, NearbyHistorySite } from "@/types/database";
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
  Navigation,
  ExternalLink,
  Ruler,
} from "lucide-react";
import { formatCoordinates } from "@/lib/utils";
import {
  formatDistance,
  formatRadiusLabel,
  readStoredUnitSystem,
  storeUnitSystem,
  RADIUS_PRESETS,
  type UnitSystem,
} from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";
import { HistoryDetailModal } from "@/components/research/HistoryDetailModal";

type SearchMode = "area" | "nearby";

const COUNTRY_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
];

function HistoryDetails({ history }: { history: AreaHistory }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-bold gold-gradient-text">{history.placeName}</h2>
          <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4" />
            {formatCoordinates(history.coordinates.lat, history.coordinates.lng)}
          </p>
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
        <p className="text-sm text-slate-400 leading-relaxed">{history.landPermissions}</p>
      </div>
    </div>
  );
}

export function ResearchPanel() {
  const [mode, setMode] = useState<SearchMode>("area");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AreaHistory | null>(null);
  const [nearbyResult, setNearbyResult] = useState<NearbyHistoryResult | null>(null);
  const [selectedSite, setSelectedSite] = useState<NearbyHistorySite | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHistory, setModalHistory] = useState<AreaHistory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setUnitSystem(readStoredUnitSystem());
  }, []);

  function updateUnitSystem(unit: UnitSystem) {
    setUnitSystem(unit);
    storeUnitSystem(unit);
  }

  async function researchLocation(researchLat: number, researchLng: number) {
    setLoading(true);
    setError(null);
    setLat(researchLat);
    setLng(researchLng);
    setBookmarked(false);
    setNearbyResult(null);
    setSelectedSite(null);

    try {
      const res = await fetch(`/api/research?lat=${researchLat}&lng=${researchLng}`);
      if (!res.ok) throw new Error("Failed to fetch area history");
      const data: AreaHistory = await res.json();
      setHistory(data);
    } catch {
      setError("Unable to research this location. Please try again.");
    }
    setLoading(false);
  }

  async function handleAreaSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setNearbyResult(null);
    setSelectedSite(null);

    try {
      const res = await fetch(`/api/research?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) {
        setError("Location not found. Try a different search.");
        setLoading(false);
        return;
      }
      const data: AreaHistory = await res.json();
      setHistory(data);
      setLat(data.coordinates.lat);
      setLng(data.coordinates.lng);
      setBookmarked(false);
    } catch {
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  }

  async function handleNearbySearch(e: React.FormEvent) {
    e.preventDefault();
    if (!zipCode.trim()) return;

    setLoading(true);
    setError(null);
    setHistory(null);
    setSelectedSite(null);
    setBookmarked(false);

    try {
      const params = new URLSearchParams({
        zip: zipCode.trim(),
        radius: String(radius),
        unit: unitSystem,
        country,
      });
      const res = await fetch(`/api/research/nearby?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to find history near that zip code.");
        setLoading(false);
        return;
      }

      const result = data as NearbyHistoryResult;
      setNearbyResult(result);
      setLat(result.center.lat);
      setLng(result.center.lng);
    } catch {
      setError("Nearby search failed. Please try again.");
    }
    setLoading(false);
  }

  async function loadSiteDetails(site: NearbyHistorySite) {
    setSelectedSite(site);
    setModalOpen(true);
    setModalHistory(null);
    setDetailLoading(true);
    setError(null);
    setBookmarked(false);
    setLat(site.coordinates.lat);
    setLng(site.coordinates.lng);

    try {
      const res = await fetch(
        `/api/research?lat=${site.coordinates.lat}&lng=${site.coordinates.lng}`
      );
      if (!res.ok) throw new Error("Failed to load site history");
      const data: AreaHistory = await res.json();
      setModalHistory(data);
    } catch {
      setError("Unable to load details for this site.");
    }
    setDetailLoading(false);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedSite(null);
    setModalHistory(null);
  }

  function handleHistoryMarkerClick(markerId: string) {
    const site = nearbyResult?.sites.find((s) => s.id === markerId);
    if (site) loadSiteDetails(site);
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
    if (mode === "area") {
      researchLocation(mapLat, mapLng);
    }
  }

  async function bookmarkSite() {
    const targetHistory = modalOpen ? modalHistory : history;
    if (!targetHistory || lat == null || lng == null) return;
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
      place_name: targetHistory.placeName,
      latitude: lat,
      longitude: lng,
      radius_km: nearbyResult?.radiusKm ?? 5,
      history_summary: targetHistory.summary,
    });

    setBookmarked(true);
    setBookmarking(false);
  }

  const mapMarkers =
    nearbyResult?.sites.map((site) => ({
      id: site.id,
      lat: site.coordinates.lat,
      lng: site.coordinates.lng,
      title: site.title,
      label: formatDistance(site.distanceKm, unitSystem),
    })) || [];

  const mapZoom =
    nearbyResult != null
      ? radius <= 10
        ? 11
        : radius <= 25
          ? 10
          : radius <= 50
            ? 9
            : 8
      : lat != null
        ? 10
        : 2;

  return (
    <div className="space-y-8">
      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-900/60 p-1 border border-slate-700/50">
            <button
              type="button"
              onClick={() => setMode("area")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                mode === "area"
                  ? "bg-gold-600 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Search Area
            </button>
            <button
              type="button"
              onClick={() => setMode("nearby")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                mode === "nearby"
                  ? "bg-gold-600 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              History Near Me
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 shrink-0">Units:</span>
            <div className="flex rounded-lg bg-slate-900/60 p-1 border border-slate-700/50">
              <button
                type="button"
                onClick={() => updateUnitSystem("imperial")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px] ${
                  unitSystem === "imperial"
                    ? "bg-slate-700 text-gold-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Miles
              </button>
              <button
                type="button"
                onClick={() => updateUnitSystem("metric")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px] ${
                  unitSystem === "metric"
                    ? "bg-slate-700 text-gold-300"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Kilometers
              </button>
            </div>
          </div>
        </div>

        {mode === "area" ? (
          <form onSubmit={handleAreaSearch} className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                className="input-field pl-11"
                placeholder="Search any location... e.g. York, England"
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
        ) : (
          <form onSubmit={handleNearbySearch} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  className="input-field pl-11"
                  placeholder="Enter zip or postal code... e.g. 90210"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                />
              </div>
              <select
                className="input-field sm:w-44"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {RADIUS_PRESETS[unitSystem].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRadius(value)}
                    className={`px-3 py-2 rounded-lg text-sm border min-h-[44px] transition-colors ${
                      radius === value
                        ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {formatRadiusLabel(value, unitSystem)}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn-primary w-full sm:w-auto shrink-0" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Nearby History"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Results are sorted closest-first from your zip code within{" "}
              {formatRadiusLabel(radius, unitSystem)}.
            </p>
          </form>
        )}

        {mode === "area" && (
          <p className="text-xs text-slate-500">
            Or click anywhere on the map below to research that area
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <DetectingMap
        center={lat != null && lng != null ? [lat, lng] : [39.8, -98.5]}
        zoom={mapZoom}
        size="md"
        selectable={mode === "area"}
        onLocationSelect={handleMapClick}
        selectedLocation={lat != null && lng != null ? { lat, lng } : null}
        radiusKm={nearbyResult?.radiusKm ?? null}
        historyMarkers={mapMarkers}
        onHistoryMarkerClick={nearbyResult ? handleHistoryMarkerClick : undefined}
      />

      {loading && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">
            {mode === "nearby" ? "Searching nearby history..." : "Researching area history..."}
          </p>
        </div>
      )}

      {nearbyResult && !loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-bold gold-gradient-text mb-1">
              History near {nearbyResult.center.postalCode || zipCode}
            </h2>
            <p className="text-sm text-slate-400">
              {nearbyResult.center.placeName} · within {formatRadiusLabel(radius, unitSystem)} ·{" "}
              {nearbyResult.sites.length} result{nearbyResult.sites.length === 1 ? "" : "s"}
            </p>
          </div>

          {nearbyResult.sites.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-sm">
              No historical sites found in this radius. Try a larger search area or a different zip
              code.
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyResult.sites.map((site, index) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => loadSiteDetails(site)}
                  className={`glass-card p-5 w-full text-left hover:border-gold-500/30 transition-all cursor-pointer ${
                    selectedSite?.id === site.id && modalOpen ? "border-gold-500/40" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gold-500">#{index + 1}</span>
                        <h3 className="font-semibold text-slate-100">{site.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 capitalize">
                          {site.source}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2">{site.summary}</p>
                      <p className="text-xs text-slate-500 mt-2">{site.placeName}</p>
                      <p className="text-xs text-gold-500/80 mt-2">Tap to view full history</p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      <span className="text-sm font-semibold text-gold-400">
                        {formatDistance(site.distanceKm, unitSystem)}
                      </span>
                      {site.wikipediaUrl && (
                        <a
                          href={site.wikipediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-slate-500 hover:text-gold-400 inline-flex items-center gap-1"
                        >
                          Wikipedia <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {history && !loading && !modalOpen && mode === "area" && (
        <div className="space-y-4">
          <div className="flex justify-end">
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
          <HistoryDetails history={history} />
        </div>
      )}

      <HistoryDetailModal
        open={modalOpen}
        onClose={closeModal}
        site={selectedSite}
        history={modalHistory}
        loading={detailLoading}
        unitSystem={unitSystem}
        onBookmark={bookmarkSite}
        bookmarking={bookmarking}
        bookmarked={bookmarked}
      />
    </div>
  );
}
