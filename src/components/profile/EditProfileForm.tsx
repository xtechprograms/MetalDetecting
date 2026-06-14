"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DETECTOR_BRANDS, DETECTOR_TYPES, getInitials } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera,
  Trash2,
} from "lucide-react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || "");
  const [detectorBrand, setDetectorBrand] = useState(profile.detector_brand || "");
  const [detectorModel, setDetectorModel] = useState(profile.detector_model || "");
  const [detectorType, setDetectorType] = useState(profile.detector_type || "");
  const [location, setLocation] = useState(profile.location || "");
  const [yearsDetecting, setYearsDetecting] = useState(
    profile.years_detecting?.toString() || ""
  );
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError("Photo must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setRemoveAvatar(false);
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setAvatar(null);
    setRemoveAvatar(true);
    setAvatarPreview(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let avatarUrl: string | null = profile.avatar_url;

    if (avatar) {
      const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatar, {
          upsert: true,
          contentType: avatar.type,
          cacheControl: "3600",
        });

      if (uploadError) {
        setError(`Failed to upload photo: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    } else if (removeAvatar) {
      avatarUrl = null;
      await supabase.storage.from("avatars").remove([`${profile.id}/avatar.jpg`, `${profile.id}/avatar.png`, `${profile.id}/avatar.webp`, `${profile.id}/avatar.gif`]);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio: bio || null,
        detector_brand: detectorBrand || null,
        detector_model: detectorModel || null,
        detector_type: detectorType || null,
        location: location || null,
        years_detecting: yearsDetecting ? parseInt(yearsDetecting, 10) : null,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setAvatar(null);
    setRemoveAvatar(false);
    setSuccess(true);
    setLoading(false);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Profile updated successfully!
        </div>
      )}

      <div className="glass-card p-5 sm:p-6 border border-slate-700/50">
        <h3 className="font-display text-lg font-semibold gold-gradient-text mb-1">
          Profile Photo
        </h3>
        <p className="text-sm text-slate-400 mb-5">
          Shown on your profile, forum posts, and navbar. JPG, PNG, WebP, or GIF — max 5 MB.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Profile preview"
              className="w-28 h-28 rounded-2xl object-cover border-2 border-gold-500/30 shadow-lg shadow-gold-500/10"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-3xl font-bold text-slate-950 border-2 border-gold-500/20">
              {getInitials(displayName || profile.username)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <label className="btn-secondary cursor-pointer text-sm justify-center">
              <Camera className="w-4 h-4" />
              {avatarPreview ? "Change Photo" : "Upload Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="btn-secondary text-sm text-red-400 border-red-800/50 justify-center"
              >
                <Trash2 className="w-4 h-4" />
                Remove Photo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-text" htmlFor="displayName">
            Display Name
          </label>
          <input
            id="displayName"
            className="input-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label-text" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className="input-field opacity-60"
            value={profile.username}
            disabled
          />
        </div>
        <div className="md:col-span-2">
          <label className="label-text" htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            className="input-field min-h-[100px]"
            placeholder="Tell the community about your detecting journey..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            className="input-field"
            placeholder="e.g. Yorkshire, England"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text" htmlFor="yearsDetecting">
            Years Detecting
          </label>
          <input
            id="yearsDetecting"
            type="number"
            className="input-field"
            placeholder="5"
            value={yearsDetecting}
            onChange={(e) => setYearsDetecting(e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-slate-700/50 pt-6">
        <h3 className="font-display text-lg font-semibold gold-gradient-text mb-4">
          My Detector
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-text" htmlFor="detectorBrand">
              Brand
            </label>
            <select
              id="detectorBrand"
              className="input-field"
              value={detectorBrand}
              onChange={(e) => setDetectorBrand(e.target.value)}
            >
              <option value="">Select brand...</option>
              {DETECTOR_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text" htmlFor="detectorModel">
              Model
            </label>
            <input
              id="detectorModel"
              className="input-field"
              placeholder="e.g. Equinox 800, AT Max"
              value={detectorModel}
              onChange={(e) => setDetectorModel(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text" htmlFor="detectorType">
              Type
            </label>
            <select
              id="detectorType"
              className="input-field"
              value={detectorType}
              onChange={(e) => setDetectorType(e.target.value)}
            >
              <option value="">Select type...</option>
              {DETECTOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </form>
  );
}
