"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DetectingMap } from "@/components/map/DetectingMap";
import {
  FIND_CATEGORIES,
  formatCoordinates,
} from "@/lib/utils";
import {
  Camera,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  Crosshair,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";

export function LogFindForm() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("coin");
  const [foundDate, setFoundDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [depthCm, setDepthCm] = useState("");
  const [signalId, setSignalId] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showOnMap, setShowOnMap] = useState(false);
  const [postAnonymously, setPostAnonymously] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGettingLocation(false);
      },
      () => {
        setError("Unable to get your location. Enter coordinates manually or click the map.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  }

  function handleMapClick(lat: number, lng: number) {
    setLatitude(lat);
    setLongitude(lng);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to log a find");
      setLoading(false);
      return;
    }

    let photoUrl: string | null = null;

    if (photo) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("find-photos")
        .upload(path, photo);

      if (uploadError) {
        setError("Failed to upload photo: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("find-photos")
        .getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("finds").insert({
      user_id: user.id,
      title,
      description: description || null,
      category,
      latitude,
      longitude,
      show_on_map: showOnMap && latitude != null && longitude != null,
      is_anonymous: postAnonymously,
      photo_url: photoUrl,
      depth_cm: depthCm ? parseInt(depthCm) : null,
      signal_id: signalId || null,
      found_date: foundDate,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (success) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold gold-gradient-text mb-2">
          Find Logged!
        </h2>
        <p className="text-slate-400">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <h2 className="font-display text-xl font-semibold gold-gradient-text">
          Find Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label-text" htmlFor="title">
              Title *
            </label>
            <input
              id="title"
              className="input-field"
              placeholder="e.g. 1892 Morgan Silver Dollar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label-text" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {FIND_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text" htmlFor="foundDate">
              Date Found
            </label>
            <input
              id="foundDate"
              type="date"
              className="input-field"
              value={foundDate}
              onChange={(e) => setFoundDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label-text" htmlFor="depth">
              Depth (cm)
            </label>
            <input
              id="depth"
              type="number"
              className="input-field"
              placeholder="15"
              value={depthCm}
              onChange={(e) => setDepthCm(e.target.value)}
            />
          </div>

          <div>
            <label className="label-text" htmlFor="signal">
              Signal ID / VDI
            </label>
            <input
              id="signal"
              className="input-field"
              placeholder="e.g. 82-84, Iron High"
              value={signalId}
              onChange={(e) => setSignalId(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="label-text" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="input-field min-h-[100px] resize-y"
              placeholder="Describe your find, condition, context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold gold-gradient-text flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Find Photo
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Preview"
              className="w-40 h-40 object-cover rounded-xl border border-gold-500/30"
            />
          ) : (
            <div className="w-40 h-40 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center bg-slate-900/50">
              <Camera className="w-8 h-8 text-slate-600" />
            </div>
          )}
          <div>
            <label className="btn-secondary cursor-pointer">
              <Camera className="w-4 h-4" />
              Choose Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG, or WebP. Max 5MB recommended.
            </p>
          </div>
        </div>
      </div>

      {/* GPS Location */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold gold-gradient-text flex items-center gap-2">
            <MapPin className="w-5 h-5 shrink-0" />
            GPS Location
          </h2>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="btn-secondary text-sm py-2 w-full sm:w-auto shrink-0"
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            Use My Location
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Click the map to set coordinates, use your device GPS, or enter manually.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Latitude</label>
            <input
              type="number"
              step="any"
              className="input-field"
              placeholder="51.5074"
              value={latitude ?? ""}
              onChange={(e) =>
                setLatitude(e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </div>
          <div>
            <label className="label-text">Longitude</label>
            <input
              type="number"
              step="any"
              className="input-field"
              placeholder="-0.1278"
              value={longitude ?? ""}
              onChange={(e) =>
                setLongitude(e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </div>
        </div>

        {latitude != null && longitude != null && (
          <p className="text-sm text-gold-400">
            📍 {formatCoordinates(latitude, longitude)}
          </p>
        )}

        <DetectingMap
          center={
            latitude != null && longitude != null
              ? [latitude, longitude]
              : [51.5074, -0.1278]
          }
          zoom={latitude != null ? 14 : 2}
          size="sm"
          selectable
          onLocationSelect={handleMapClick}
          selectedLocation={
            latitude != null && longitude != null
              ? { lat: latitude, lng: longitude }
              : null
          }
        />

        {/* Privacy — anonymous by default */}
        <div className="space-y-3">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
              postAnonymously
                ? "bg-slate-800/30 border-slate-700/50"
                : "bg-amber-950/20 border-amber-700/40"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-3">
              <Shield
                className={`w-5 h-5 shrink-0 ${postAnonymously ? "text-gold-400" : "text-amber-400"}`}
              />
              <div>
                <p className="font-medium text-sm">Post anonymously (recommended)</p>
                <p className="text-xs text-slate-500">
                  Other users cannot link this find or location to your profile
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={postAnonymously}
              onClick={() => setPostAnonymously(!postAnonymously)}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                postAnonymously ? "bg-gold-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  postAnonymously ? "left-1" : "left-6"
                }`}
              />
            </button>
          </div>

          {!postAnonymously && (
            <div className="flex gap-2 p-4 rounded-xl bg-amber-950/30 border border-amber-700/40 text-amber-100/90 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p>
                Your username may be shown with this find. Other users can connect your
                profile to this location, which could reveal where you detect. Only disable
                anonymity if you are comfortable sharing that information.
              </p>
            </div>
          )}
        </div>

        {/* Show on map toggle */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
            showOnMap
              ? "bg-gold-500/10 border-gold-500/30"
              : "bg-slate-800/30 border-slate-700/50"
          }`}
        >
          <div className="flex items-center gap-3">
            {showOnMap ? (
              <Eye className="w-5 h-5 text-gold-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-slate-500" />
            )}
            <div>
              <p className="font-medium text-sm">Show on Global Map</p>
              <p className="text-xs text-slate-500">
                {postAnonymously
                  ? "Share the find location without revealing who posted it"
                  : "Share this find's location and your profile with the community"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showOnMap}
            onClick={() => setShowOnMap(!showOnMap)}
            disabled={latitude == null || longitude == null}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              showOnMap ? "bg-gold-500" : "bg-slate-700"
            } ${latitude == null ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                showOnMap ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full text-lg py-4" disabled={loading}>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "Log This Find"
        )}
      </button>
    </form>
  );
}
