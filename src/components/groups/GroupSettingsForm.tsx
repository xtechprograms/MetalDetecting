"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeGroupBannerStorage, uploadGroupBanner } from "@/lib/groups/uploadGroupBanner";
import type { Group } from "./types";
import { ImagePlus, Loader2, Settings, Trash2 } from "lucide-react";

type GroupSettingsFormProps = {
  group: Group;
  isOwner: boolean;
  onUpdated: (group: Group) => void;
  embedded?: boolean;
};

export function GroupSettingsForm({
  group,
  isOwner,
  onUpdated,
  embedded = false,
}: GroupSettingsFormProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [bannerUrl, setBannerUrl] = useState(group.banner_url);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleSaveDetails(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || saving) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    const { data, error: updateError } = await supabase
      .from("groups")
      .update({
        name: trimmedName,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", group.id)
      .select("*")
      .single();

    if (updateError || !data) {
      setError(updateError?.message || "Could not update group.");
    } else {
      onUpdated({ ...group, ...data, banner_url: bannerUrl });
      setMessage("Group details saved.");
    }
    setSaving(false);
  }

  async function handleBannerUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    setError(null);
    setMessage(null);

    if (bannerUrl) {
      await removeGroupBannerStorage(supabase, bannerUrl);
    }

    const { url, error: uploadError } = await uploadGroupBanner(supabase, group.id, file);
    if (uploadError || !url) {
      setError(uploadError || "Banner upload failed.");
      setUploadingBanner(false);
      event.target.value = "";
      return;
    }

    const { data, error: updateError } = await supabase
      .from("groups")
      .update({ banner_url: url, updated_at: new Date().toISOString() })
      .eq("id", group.id)
      .select("*")
      .single();

    if (updateError || !data) {
      setError(updateError?.message || "Could not save banner.");
    } else {
      setBannerUrl(url);
      onUpdated({ ...group, ...data, banner_url: url });
      setMessage("Banner updated.");
    }

    setUploadingBanner(false);
    event.target.value = "";
  }

  async function handleRemoveBanner() {
    if (!bannerUrl || !confirm("Remove the group banner?")) return;

    setUploadingBanner(true);
    await removeGroupBannerStorage(supabase, bannerUrl);

    const { data, error: updateError } = await supabase
      .from("groups")
      .update({ banner_url: null, updated_at: new Date().toISOString() })
      .eq("id", group.id)
      .select("*")
      .single();

    if (!updateError && data) {
      setBannerUrl(null);
      onUpdated({ ...group, ...data, banner_url: null });
      setMessage("Banner removed.");
    }
    setUploadingBanner(false);
  }

  return (
    <div className={embedded ? "p-4 sm:p-5" : "glass-card p-4 sm:p-5 mb-6"}>
      <h2 className="font-display text-base font-semibold flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gold-400" />
        Group settings
      </h2>

      <div className="mb-5">
        <p className="label-text">Banner photo</p>
        <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 aspect-[21/8] sm:aspect-[21/6]">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No banner yet
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleBannerUpload(event)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingBanner}
            className="btn-secondary text-sm min-h-[44px]"
          >
            {uploadingBanner ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                {bannerUrl ? "Change banner" : "Upload banner"}
              </>
            )}
          </button>
          {bannerUrl && (
            <button
              type="button"
              onClick={() => void handleRemoveBanner()}
              disabled={uploadingBanner}
              className="btn-secondary text-sm min-h-[44px] text-red-300 hover:text-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Remove banner
            </button>
          )}
        </div>
      </div>

      <form onSubmit={(event) => void handleSaveDetails(event)} className="space-y-4">
        <div>
          <label className="label-text" htmlFor="group-settings-name">
            Group name
          </label>
          <input
            id="group-settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-field"
            disabled={!isOwner}
          />
        </div>
        <div>
          <label className="label-text" htmlFor="group-settings-description">
            Description
          </label>
          <textarea
            id="group-settings-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="input-field min-h-[88px] resize-y"
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-gold-400">{message}</p>}
        <button type="submit" disabled={saving} className="btn-primary min-h-[44px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save details"}
        </button>
      </form>
    </div>
  );
}
