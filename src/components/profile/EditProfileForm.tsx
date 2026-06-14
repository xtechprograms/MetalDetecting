"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DETECTOR_BRANDS, DETECTOR_TYPES } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera,
  User,
} from "lucide-react";

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
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let avatarUrl = profile.avatar_url;

    if (avatar) {
      const ext = avatar.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      await supabase.storage.from("avatars").upload(path, avatar, {
        upsert: true,
      });
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = data.publicUrl;
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
        years_detecting: yearsDetecting ? parseInt(yearsDetecting) : null,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-900/30 border border-green-700/50 text-green-300 text-sm">
          <CheckCircle className="w-4 h-4" />
          Profile updated successfully!
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-6">
        {avatarPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview}
            alt="Avatar"
            className="w-24 h-24 rounded-2xl object-cover border-2 border-gold-500/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center">
            <User className="w-10 h-10 text-slate-950" />
          </div>
        )}
        <label className="btn-secondary cursor-pointer text-sm">
          <Camera className="w-4 h-4" />
          Change Photo
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label-text">Display Name</label>
          <input
            className="input-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label-text">Username</label>
          <input className="input-field opacity-60" value={profile.username} disabled />
        </div>
        <div className="md:col-span-2">
          <label className="label-text">Bio</label>
          <textarea
            className="input-field min-h-[100px]"
            placeholder="Tell the community about your detecting journey..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text">Location</label>
          <input
            className="input-field"
            placeholder="e.g. Yorkshire, England"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text">Years Detecting</label>
          <input
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
            <label className="label-text">Brand</label>
            <select
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
            <label className="label-text">Model</label>
            <input
              className="input-field"
              placeholder="e.g. Equinox 800, AT Max"
              value={detectorModel}
              onChange={(e) => setDetectorModel(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text">Type</label>
            <select
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

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </form>
  );
}
