"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { FORUM_IMAGE_LIMITS } from "@/lib/forum/uploadForumImages";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

export function ForumImageUpload({ files, onChange, disabled }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const combined = [...files, ...selected].slice(0, FORUM_IMAGE_LIMITS.maxFiles);
    onChange(combined);
    e.target.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`btn-secondary text-sm cursor-pointer ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Camera className="w-4 h-4" />
          Add Images
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={disabled || files.length >= FORUM_IMAGE_LIMITS.maxFiles}
            onChange={handleSelect}
          />
        </label>
        <span className="text-xs text-slate-500">
          Up to {FORUM_IMAGE_LIMITS.maxFiles} images, 5 MB each
        </span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/80 text-slate-200 hover:text-red-400"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
