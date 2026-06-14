"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadForumImages } from "@/lib/forum/uploadForumImages";
import { ForumImageUpload } from "@/components/forum/ForumImageUpload";
import { ForumPostContent } from "@/components/forum/ForumPostContent";
import { Pencil, Loader2, AlertCircle, X, Check } from "lucide-react";

function normalizeContent(content: string) {
  return content === "(image post)" || content === "(image reply)" ? "" : content;
}

type Props = {
  mode: "thread" | "reply";
  id: string;
  ownerId: string;
  currentUserId: string | null;
  title?: string;
  content: string;
  imageUrls?: string[] | null;
};

export function EditableForumContent({
  mode,
  id,
  ownerId,
  currentUserId,
  title: initialTitle,
  content: initialContent,
  imageUrls: initialImageUrls,
}: Props) {
  const isOwner = currentUserId === ownerId;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(normalizeContent(initialContent));
  const [existingImages, setExistingImages] = useState<string[]>(initialImageUrls || []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function startEdit() {
    setTitle(initialTitle || "");
    setContent(normalizeContent(initialContent));
    setExistingImages(initialImageUrls || []);
    setNewImages([]);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    const { urls: uploaded, error: uploadError } = await uploadForumImages(
      supabase,
      currentUserId,
      newImages
    );

    if (uploadError) {
      setError(uploadError);
      setLoading(false);
      return;
    }

    const finalImages = [...existingImages, ...uploaded];
    const trimmedContent = content.trim();
    const finalContent =
      trimmedContent ||
      (finalImages.length > 0
        ? mode === "thread"
          ? "(image post)"
          : "(image reply)"
        : "");

    if (!finalContent && finalImages.length === 0) {
      setError("Add some text or at least one image");
      setLoading(false);
      return;
    }

    if (mode === "thread") {
      if (title.trim().length < 5) {
        setError("Title must be at least 5 characters");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("forum_threads")
        .update({
          title: title.trim(),
          content: finalContent,
          image_urls: finalImages,
        })
        .eq("id", id)
        .eq("user_id", currentUserId);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: updateError } = await supabase
        .from("forum_posts")
        .update({
          content: finalContent,
          image_urls: finalImages,
        })
        .eq("id", id)
        .eq("user_id", currentUserId);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    }

    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        {mode === "thread" && initialTitle && (
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-100 break-words">
            {initialTitle}
          </h1>
        )}
        <div className={mode === "thread" ? "mt-6 pt-6 border-t border-slate-700/50" : ""}>
          <ForumPostContent content={initialContent} imageUrls={initialImageUrls} />
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={startEdit}
            className="btn-ghost text-sm text-slate-400 hover:text-gold-400 mt-3 py-2 min-h-[44px]"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {mode === "thread" && (
        <div>
          <label className="label-text" htmlFor={`edit-title-${id}`}>
            Title
          </label>
          <input
            id={`edit-title-${id}`}
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={5}
            maxLength={200}
          />
        </div>
      )}

      <div>
        <label className="label-text" htmlFor={`edit-content-${id}`}>
          {mode === "thread" ? "Content" : "Reply"}
        </label>
        <textarea
          id={`edit-content-${id}`}
          className="input-field min-h-[120px] resize-y"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {existingImages.length > 0 && (
        <div>
          <p className="label-text">Current images</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {existingImages.map((url) => (
              <div
                key={url}
                className="relative aspect-square rounded-xl overflow-hidden border border-slate-700/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/80 text-slate-200 hover:text-red-400"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-text">Add images</p>
        <ForumImageUpload files={newImages} onChange={setNewImages} disabled={loading} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleSave} className="btn-primary text-sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
        <button type="button" onClick={cancelEdit} className="btn-secondary text-sm" disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}
