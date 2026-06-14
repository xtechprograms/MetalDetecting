"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { GalleryComment, GalleryPhoto } from "@/types/database";
import { formatDate, getInitials } from "@/lib/utils";
import {
  Camera,
  Heart,
  Loader2,
  MessageCircle,
  Trash2,
  AlertCircle,
  Images,
} from "lucide-react";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PhotoWithMeta = GalleryPhoto & { likedByMe: boolean };

type Props = {
  isOwner: boolean;
  currentUserId: string | null;
  initialPhotos: PhotoWithMeta[];
  initialComments: GalleryComment[];
};

export function ProfileGallery({
  isOwner,
  currentUserId,
  initialPhotos,
  initialComments,
}: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [comments, setComments] = useState(initialComments);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const commentsByPhoto = comments.reduce<Record<string, GalleryComment[]>>((acc, c) => {
    if (!acc[c.photo_id]) acc[c.photo_id] = [];
    acc[c.photo_id].push(c);
    return acc;
  }, {});

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photo must be 8 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${currentUserId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(path);

    const { data: inserted, error: insertError } = await supabase
      .from("profile_gallery_photos")
      .insert({
        user_id: currentUserId,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      setError(insertError?.message || "Failed to save photo");
      setUploading(false);
      return;
    }

    setPhotos((prev) => [{ ...inserted, likedByMe: false }, ...prev]);
    setCaption("");
    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  async function deletePhoto(photoId: string, imageUrl: string) {
    if (!confirm("Delete this photo from your gallery?")) return;

    await supabase.from("profile_gallery_photos").delete().eq("id", photoId);

    const pathMatch = imageUrl.match(/gallery-photos\/(.+)$/);
    if (pathMatch?.[1]) {
      await supabase.storage.from("gallery-photos").remove([decodeURIComponent(pathMatch[1])]);
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setComments((prev) => prev.filter((c) => c.photo_id !== photoId));
    router.refresh();
  }

  async function toggleLike(photo: PhotoWithMeta) {
    if (!currentUserId || photo.user_id === currentUserId || likeLoading) return;

    setLikeLoading(photo.id);

    if (photo.likedByMe) {
      await supabase
        .from("gallery_likes")
        .delete()
        .eq("photo_id", photo.id)
        .eq("user_id", currentUserId);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? { ...p, likedByMe: false, like_count: Math.max(p.like_count - 1, 0) }
            : p
        )
      );
    } else {
      await supabase.from("gallery_likes").insert({
        photo_id: photo.id,
        user_id: currentUserId,
      });

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, likedByMe: true, like_count: p.like_count + 1 } : p
        )
      );
    }

    setLikeLoading(null);
    router.refresh();
  }

  async function submitComment(photoId: string) {
    const content = commentDrafts[photoId]?.trim();
    if (!content || !currentUserId) return;

    setCommentLoading(photoId);

    const { data, error: insertError } = await supabase
      .from("gallery_comments")
      .insert({ photo_id: photoId, user_id: currentUserId, content })
      .select("*, profiles(username, display_name, avatar_url)")
      .single();

    if (!insertError && data) {
      setComments((prev) => [...prev, data as GalleryComment]);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, comment_count: p.comment_count + 1 } : p
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [photoId]: "" }));
    }

    setCommentLoading(null);
    router.refresh();
  }

  return (
    <div className="glass-card p-5 sm:p-6 mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Images className="w-5 h-5 text-gold-500" />
          Photo Gallery
        </h2>
        {isOwner && (
          <label className="btn-primary text-sm cursor-pointer justify-center w-full sm:w-auto">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Add Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      {isOwner && (
        <div className="mb-6">
          <label className="label-text" htmlFor="gallery-caption">
            Caption for next upload (optional)
          </label>
          <input
            id="gallery-caption"
            className="input-field"
            placeholder="Describe this find or moment..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/30 border border-red-700/50 text-red-300 text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Images className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          {isOwner
            ? "Your gallery is empty — add photos to share with the community!"
            : "No gallery photos yet"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {photos.map((photo) => {
            const photoComments = commentsByPhoto[photo.id] || [];
            const showComments = expandedPhoto === photo.id;
            const canLike = currentUserId && currentUserId !== photo.user_id;

            return (
              <div
                key={photo.id}
                className="rounded-xl overflow-hidden bg-slate-800/30 border border-slate-700/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image_url}
                  alt={photo.caption || "Gallery photo"}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4">
                  {photo.caption && (
                    <p className="text-sm text-slate-300 mb-3">{photo.caption}</p>
                  )}
                  <p className="text-xs text-slate-600 mb-3">{formatDate(photo.created_at)}</p>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {canLike ? (
                      <button
                        type="button"
                        onClick={() => toggleLike(photo)}
                        disabled={likeLoading === photo.id}
                        className={`inline-flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg min-h-[44px] transition-colors ${
                          photo.likedByMe
                            ? "text-red-400 bg-red-400/10"
                            : "text-slate-400 hover:text-red-400 hover:bg-slate-800/50"
                        }`}
                      >
                        {likeLoading === photo.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Heart className={`w-4 h-4 ${photo.likedByMe ? "fill-current" : ""}`} />
                        )}
                        {photo.like_count}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 px-2">
                        <Heart className="w-4 h-4" />
                        {photo.like_count}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPhoto(showComments ? null : photo.id)
                      }
                      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold-400 px-2 py-1 rounded-lg min-h-[44px]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {photo.comment_count}
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo.id, photo.image_url)}
                        className="inline-flex items-center gap-1 text-sm text-red-400 hover:bg-red-900/20 px-2 py-1 rounded-lg ml-auto min-h-[44px]"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>

                  {showComments && (
                    <div className="border-t border-slate-700/50 pt-3 space-y-3">
                      {photoComments.length === 0 ? (
                        <p className="text-xs text-slate-500">No comments yet</p>
                      ) : (
                        photoComments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            {comment.profiles?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={comment.profiles.avatar_url}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-xs font-bold text-slate-950 shrink-0">
                                {getInitials(comment.profiles?.display_name || "?")}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/profile/${comment.profiles?.username}`}
                                  className="text-sm font-semibold hover:text-gold-400"
                                >
                                  {comment.profiles?.display_name}
                                </Link>
                                <span className="text-xs text-slate-600">
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300 break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}

                      {currentUserId ? (
                        <div className="flex gap-2 pt-2">
                          <input
                            className="input-field text-sm py-2"
                            placeholder="Write a comment..."
                            value={commentDrafts[photo.id] || ""}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [photo.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submitComment(photo.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => submitComment(photo.id)}
                            disabled={commentLoading === photo.id}
                            className="btn-secondary text-sm shrink-0 px-3"
                          >
                            {commentLoading === photo.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Post"
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          <Link href="/login" className="text-gold-400 hover:underline">
                            Sign in
                          </Link>{" "}
                          to comment
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
