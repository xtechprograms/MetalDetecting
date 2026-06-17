"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadCommunityMedia } from "@/lib/community/uploadCommunityMedia";
import type { CommunityPost } from "./types";
import type { Profile } from "@/types/database";
import { CommunityPostAuthor } from "./CommunityPostAuthor";
import { ImagePlus, Loader2, Send, Video, X } from "lucide-react";

type CommunityPostComposerProps = {
  userId: string;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
  onPosted: (post: CommunityPost) => void;
};

export function CommunityPostComposer({
  userId,
  profile,
  onPosted,
}: CommunityPostComposerProps) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function addFiles(selected: FileList | null, kind: "image" | "video") {
    if (!selected?.length) return;

    const incoming = Array.from(selected).filter((file) =>
      kind === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/")
    );

    const next = [...files, ...incoming];
    setFiles(next);
    setPreviews((prev) => [
      ...prev,
      ...incoming.map((file) => URL.createObjectURL(file)),
    ]);
    setError(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (posting) return;

    const trimmed = body.trim();
    if (!trimmed && files.length === 0) {
      setError("Write something or add a photo/video.");
      return;
    }

    setPosting(true);
    setError(null);

    const { media, error: uploadError } = await uploadCommunityMedia(
      supabase,
      userId,
      files
    );

    if (uploadError) {
      setError(uploadError);
      setPosting(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        body: trimmed || null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      setError(insertError?.message || "Failed to create post.");
      setPosting(false);
      return;
    }

    let savedMedia = media;

    if (media.length > 0) {
      const { data: mediaRows, error: mediaError } = await supabase
        .from("community_post_media")
        .insert(
          media.map((item) => ({
            post_id: inserted.id,
            media_url: item.media_url,
            media_type: item.media_type,
            sort_order: item.sort_order,
          }))
        )
        .select("*");

      if (mediaError) {
        setError(mediaError.message);
        setPosting(false);
        return;
      }

      savedMedia = mediaRows || media;
    }

    onPosted({
      ...inserted,
      author: profile,
      media: savedMedia,
    });

    setBody("");
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setPosting(false);
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="glass-card p-3 sm:p-5 mb-4 sm:mb-6 w-full min-w-0 overflow-hidden"
    >
      <CommunityPostAuthor profile={profile} />

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Share an update with the community..."
        rows={3}
        className="mt-4 w-full min-w-0 max-w-full rounded-xl bg-slate-900/70 border border-slate-700 px-3 sm:px-4 py-3 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-y min-h-[88px]"
      />

      {previews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previews.map((preview, index) => {
            const file = files[index];
            const isVideo = file?.type.startsWith("video/");

            return (
              <div key={preview} className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-800">
                {isVideo ? (
                  <video src={preview} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files, "image")}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files, "video")}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm text-slate-300 hover:text-gold-400 hover:bg-slate-800/70 transition-colors touch-manipulation"
          >
            <ImagePlus className="w-4 h-4" />
            Photos
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-sm text-slate-300 hover:text-gold-400 hover:bg-slate-800/70 transition-colors touch-manipulation"
          >
            <Video className="w-4 h-4" />
            Video
          </button>
        </div>

        <button
          type="submit"
          disabled={posting}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-gold-500 text-slate-950 font-medium text-sm hover:bg-gold-400 disabled:opacity-60 transition-colors touch-manipulation"
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Post
        </button>
      </div>
    </form>
  );
}
