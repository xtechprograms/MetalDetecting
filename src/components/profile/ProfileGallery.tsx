"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MediaLightbox } from "@/components/community/MediaLightbox";
import type { GalleryAlbum, GalleryComment, GalleryPhoto } from "@/types/database";
import { formatDate, getInitials } from "@/lib/utils";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Heart,
  Images,
  Loader2,
  MessageCircle,
  Trash2,
} from "lucide-react";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PHOTOS_PER_PAGE = 2;

type PhotoWithMeta = GalleryPhoto & { likedByMe: boolean };
type AlbumFilter = "all" | "uncategorized" | string;

type Props = {
  isOwner: boolean;
  currentUserId: string | null;
  albumsEnabled?: boolean;
  initialAlbums: GalleryAlbum[];
  initialPhotos: PhotoWithMeta[];
  initialComments: GalleryComment[];
};

export function ProfileGallery({
  isOwner,
  currentUserId,
  albumsEnabled = true,
  initialAlbums,
  initialPhotos,
  initialComments,
}: Props) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [photos, setPhotos] = useState(initialPhotos);
  const [comments, setComments] = useState(initialComments);
  const [activeAlbum, setActiveAlbum] = useState<AlbumFilter>("all");
  const [carouselPage, setCarouselPage] = useState(0);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [newAlbumName, setNewAlbumName] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [assignAlbumId, setAssignAlbumId] = useState("");
  const [assigningAlbum, setAssigningAlbum] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const commentsByPhoto = comments.reduce<Record<string, GalleryComment[]>>((acc, comment) => {
    if (!acc[comment.photo_id]) acc[comment.photo_id] = [];
    acc[comment.photo_id].push(comment);
    return acc;
  }, {});

  const filteredPhotos = useMemo(() => {
    if (activeAlbum === "all") return photos;
    if (activeAlbum === "uncategorized") return photos.filter((photo) => !photo.album_id);
    return photos.filter((photo) => photo.album_id === activeAlbum);
  }, [activeAlbum, photos]);

  const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE));
  const safePage = Math.min(carouselPage, totalPages - 1);
  const visiblePhotos = filteredPhotos.slice(
    safePage * PHOTOS_PER_PAGE,
    safePage * PHOTOS_PER_PAGE + PHOTOS_PER_PAGE
  );

  useEffect(() => {
    setCarouselPage(0);
    setShowComments(false);
    setLightboxIndex(null);
  }, [activeAlbum]);

  const visiblePhotoKey = visiblePhotos.map((photo) => photo.id).join("|");

  useEffect(() => {
    if (!visiblePhotoKey) {
      setActivePhotoId(null);
      return;
    }
    const ids = visiblePhotoKey.split("|");
    setActivePhotoId((current) => (current && ids.includes(current) ? current : ids[0]));
  }, [visiblePhotoKey]);

  useEffect(() => {
    if (carouselPage > totalPages - 1) {
      setCarouselPage(Math.max(totalPages - 1, 0));
    }
  }, [carouselPage, totalPages]);

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function uploadSingleFile(file: File, photoCaption: string | null) {
    if (!currentUserId) return null;

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Use JPG, PNG, WebP, or GIF.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Each photo must be 8 MB or smaller.");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from("gallery-photos").getPublicUrl(path);

    const insertPayload: {
      user_id: string;
      image_url: string;
      caption: string | null;
      album_id?: string;
    } = {
      user_id: currentUserId,
      image_url: urlData.publicUrl,
      caption: photoCaption,
    };

    if (activeAlbum !== "all" && activeAlbum !== "uncategorized") {
      insertPayload.album_id = activeAlbum;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("profile_gallery_photos")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message || "Failed to save photo");
    }

    return { ...inserted, likedByMe: false } as PhotoWithMeta;
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length || !currentUserId) return;

    setUploading(true);
    setError(null);

    const uploaded: PhotoWithMeta[] = [];
    const savedCaption = caption.trim();

    try {
      const fileList = Array.from(files);
      for (let index = 0; index < fileList.length; index += 1) {
        const photo = await uploadSingleFile(
          fileList[index],
          index === 0 ? savedCaption || null : null
        );
        if (photo) uploaded.push(photo);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setUploading(false);
      event.target.value = "";
      return;
    }

    if (uploaded.length > 0) {
      setPhotos((prev) => [...uploaded, ...prev]);
      setCaption("");
    }

    setUploading(false);
    event.target.value = "";
    router.refresh();
  }

  async function deletePhoto(photoId: string, imageUrl: string) {
    if (!confirm("Delete this photo from your gallery?")) return;

    await supabase.from("profile_gallery_photos").delete().eq("id", photoId);

    const pathMatch = imageUrl.match(/gallery-photos\/(.+)$/);
    if (pathMatch?.[1]) {
      await supabase.storage.from("gallery-photos").remove([decodeURIComponent(pathMatch[1])]);
    }

    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    setComments((prev) => prev.filter((comment) => comment.photo_id !== photoId));
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
    router.refresh();
  }

  async function createAlbumFromSelection() {
    const name = newAlbumName.trim();
    const photoIds = Array.from(selectedPhotoIds);

    if (!currentUserId || !name || photoIds.length === 0 || creatingAlbum) return;

    setCreatingAlbum(true);
    setError(null);

    const { data: album, error: albumError } = await supabase
      .from("profile_gallery_albums")
      .insert({ user_id: currentUserId, name })
      .select("*")
      .single();

    if (albumError || !album) {
      setError(albumError?.message || "Could not create album.");
      setCreatingAlbum(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profile_gallery_photos")
      .update({ album_id: album.id })
      .in("id", photoIds)
      .eq("user_id", currentUserId);

    if (updateError) {
      setError(updateError.message);
      setCreatingAlbum(false);
      return;
    }

    setAlbums((prev) => [album, ...prev]);
    setPhotos((prev) =>
      prev.map((photo) =>
        photoIds.includes(photo.id) ? { ...photo, album_id: album.id } : photo
      )
    );
    setNewAlbumName("");
    setSelectedPhotoIds(new Set());
    setSelectMode(false);
    setActiveAlbum(album.id);
    setCreatingAlbum(false);
    router.refresh();
  }

  async function assignSelectedToAlbum() {
    const photoIds = Array.from(selectedPhotoIds);
    if (!currentUserId || !assignAlbumId || photoIds.length === 0 || assigningAlbum) return;

    setAssigningAlbum(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profile_gallery_photos")
      .update({ album_id: assignAlbumId })
      .in("id", photoIds)
      .eq("user_id", currentUserId);

    if (updateError) {
      setError(updateError.message);
      setAssigningAlbum(false);
      return;
    }

    setPhotos((prev) =>
      prev.map((photo) =>
        photoIds.includes(photo.id) ? { ...photo, album_id: assignAlbumId } : photo
      )
    );
    setSelectedPhotoIds(new Set());
    setSelectMode(false);
    setAssignAlbumId("");
    setAssigningAlbum(false);
    setActiveAlbum(assignAlbumId);
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
        prev.map((item) =>
          item.id === photo.id
            ? { ...item, likedByMe: false, like_count: Math.max(item.like_count - 1, 0) }
            : item
        )
      );
    } else {
      await supabase.from("gallery_likes").insert({
        photo_id: photo.id,
        user_id: currentUserId,
      });

      setPhotos((prev) =>
        prev.map((item) =>
          item.id === photo.id
            ? { ...item, likedByMe: true, like_count: item.like_count + 1 }
            : item
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
        prev.map((photo) =>
          photo.id === photoId ? { ...photo, comment_count: photo.comment_count + 1 } : photo
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [photoId]: "" }));
    }

    setCommentLoading(null);
    router.refresh();
  }

  function openLightbox(photoId: string) {
    const index = filteredPhotos.findIndex((photo) => photo.id === photoId);
    if (index < 0) return;
    setLightboxIndex(index);
    setActivePhotoId(photoId);
    setShowComments(false);
  }

  function renderPhotoTile(photo: PhotoWithMeta) {
    const isSelected = selectedPhotoIds.has(photo.id);
    const isActive = activePhotoId === photo.id;

    return (
      <button
        type="button"
        onClick={() => {
          if (selectMode) {
            togglePhotoSelection(photo.id);
            return;
          }
          openLightbox(photo.id);
        }}
        aria-label={selectMode ? "Select photo" : "View photo larger"}
        className={`relative w-full rounded-xl overflow-hidden border transition-colors aspect-[4/3] ${
          selectMode && isSelected
            ? "border-gold-500 ring-2 ring-gold-500/40"
            : isActive
              ? "border-gold-500/50 ring-1 ring-gold-500/30"
              : "border-slate-700/50 hover:border-slate-600 cursor-zoom-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image_url}
          alt={photo.caption || "Gallery photo"}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-2 py-2 flex items-center gap-2 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {photo.like_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {photo.comment_count}
          </span>
        </div>
        {selectMode && (
          <span
            className={`absolute top-2 right-2 w-7 h-7 rounded-full border flex items-center justify-center ${
              isSelected
                ? "bg-gold-500 border-gold-400 text-slate-950"
                : "bg-slate-950/70 border-slate-600 text-transparent"
            }`}
          >
            <Check className="w-4 h-4" />
          </span>
        )}
      </button>
    );
  }

  function renderActivePhotoDetails() {
    if (selectMode || !activePhotoId) return null;

    const photo = photos.find((item) => item.id === activePhotoId);
    if (!photo) return null;

    const photoComments = commentsByPhoto[photo.id] || [];
    const canLike = currentUserId && currentUserId !== photo.user_id;

    return (
      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/20 p-4 min-w-0">
        {photo.caption && (
          <p className="text-sm text-slate-300 mb-2 break-words">{photo.caption}</p>
        )}
        <p className="text-xs text-slate-600 mb-3">{formatDate(photo.created_at)}</p>

        <div className="flex flex-wrap items-center gap-2">
          {canLike ? (
            <button
              type="button"
              onClick={() => void toggleLike(photo)}
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
            onClick={() => setShowComments((value) => !value)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold-400 px-2 py-1 rounded-lg min-h-[44px]"
          >
            <MessageCircle className="w-4 h-4" />
            {photo.comment_count}
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => void deletePhoto(photo.id, photo.image_url)}
              className="inline-flex items-center gap-1 text-sm text-red-400 hover:bg-red-900/20 px-2 py-1 rounded-lg ml-auto min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>

        {showComments && (
          <div className="border-t border-slate-700/50 pt-3 mt-3 space-y-3 max-h-64 overflow-y-auto">
            {photoComments.length === 0 ? (
              <p className="text-xs text-slate-500">No comments yet</p>
            ) : (
              photoComments.map((comment) => (
                <div key={comment.id} className="flex gap-2 min-w-0">
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
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <input
                  className="input-field text-sm py-2 min-w-0"
                  placeholder="Write a comment..."
                  value={commentDrafts[photo.id] || ""}
                  onChange={(event) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [photo.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitComment(photo.id);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void submitComment(photo.id)}
                  disabled={commentLoading === photo.id}
                  className="btn-secondary text-sm shrink-0 px-3 min-h-[44px]"
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
    );
  }

  const albumTabs: { id: AlbumFilter; label: string }[] = albumsEnabled
    ? [
        { id: "all", label: "All photos" },
        { id: "uncategorized", label: "Uncategorized" },
        ...albums.map((album) => ({ id: album.id, label: album.name })),
      ]
    : [{ id: "all", label: "All photos" }];

  return (
    <div className="glass-card p-5 sm:p-6 mb-6 sm:mb-8 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Images className="w-5 h-5 text-gold-500 shrink-0" />
          Photo Gallery
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isOwner && photos.length > 0 && albumsEnabled && (
            <button
              type="button"
              onClick={() => {
                setSelectMode((value) => !value);
                setSelectedPhotoIds(new Set());
                setShowComments(false);
                setLightboxIndex(null);
              }}
              className={`btn-secondary text-sm min-h-[44px] w-full sm:w-auto justify-center ${
                selectMode ? "border-gold-500/40 text-gold-300" : ""
              }`}
            >
              {selectMode ? "Cancel select" : "Select photos"}
            </button>
          )}
          {isOwner && (
            <label className="btn-primary text-sm cursor-pointer justify-center w-full sm:w-auto min-h-[44px]">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              Add photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                multiple
                disabled={uploading}
                onChange={(event) => void handleUpload(event)}
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [-webkit-overflow-scrolling:touch]">
        {albumTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveAlbum(tab.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm min-h-[44px] border transition-colors ${
              activeAlbum === tab.id
                ? "bg-gold-500/15 text-gold-300 border-gold-500/30"
                : "bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isOwner && selectMode && albumsEnabled && (
        <div className="mb-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
          <p className="text-sm text-slate-300">
            {selectedPhotoIds.size} photo{selectedPhotoIds.size === 1 ? "" : "s"} selected — tap
            photos in the gallery to select them.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newAlbumName}
              onChange={(event) => setNewAlbumName(event.target.value)}
              placeholder="New album name"
              className="input-field flex-1 min-w-0"
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => void createAlbumFromSelection()}
              disabled={creatingAlbum || selectedPhotoIds.size === 0 || !newAlbumName.trim()}
              className="btn-primary text-sm min-h-[44px] w-full sm:w-auto justify-center"
            >
              {creatingAlbum ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  Create album
                </>
              )}
            </button>
          </div>
          {albums.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={assignAlbumId}
                onChange={(event) => setAssignAlbumId(event.target.value)}
                className="input-field flex-1 min-w-0"
              >
                <option value="">Add to existing album...</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void assignSelectedToAlbum()}
                disabled={assigningAlbum || selectedPhotoIds.size === 0 || !assignAlbumId}
                className="btn-secondary text-sm min-h-[44px] w-full sm:w-auto justify-center"
              >
                {assigningAlbum ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to album"}
              </button>
            </div>
          )}
        </div>
      )}

      {!albumsEnabled && isOwner && (
        <div className="mb-4 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200/90 text-sm">
          Photo albums are not set up yet. Run{" "}
          <code className="text-xs bg-slate-900/60 px-1.5 py-0.5 rounded">gallery-albums.sql</code>{" "}
          (step 26) in the Supabase SQL Editor to enable albums.
        </div>
      )}

      {isOwner && !selectMode && (
        <div className="mb-4">
          <label className="label-text" htmlFor="gallery-caption">
            Caption for next upload (optional)
          </label>
          <input
            id="gallery-caption"
            className="input-field"
            placeholder="Describe this find or moment..."
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
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

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Images className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          {isOwner
            ? activeAlbum === "uncategorized"
              ? "No uncategorized photos — upload some or browse another album."
              : activeAlbum !== "all"
                ? "This album is empty. Select photos and add them here, or upload while viewing this album."
                : "Your gallery is empty — add photos to share with the community!"
            : "No gallery photos in this album yet"}
        </div>
      ) : (
        <div className="relative">
          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => setCarouselPage((page) => Math.max(page - 1, 0))}
              disabled={safePage === 0}
              className="absolute left-0 top-[38%] -translate-y-1/2 z-10 min-h-11 min-w-11 p-2 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white touch-manipulation"
              aria-label="Previous photos"
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
          )}

          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => setCarouselPage((page) => Math.min(page + 1, totalPages - 1))}
              disabled={safePage >= totalPages - 1}
              className="absolute right-0 top-[38%] -translate-y-1/2 z-10 min-h-11 min-w-11 p-2 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white touch-manipulation"
              aria-label="Next photos"
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 px-0 sm:px-10 min-w-0">
            {visiblePhotos.map((photo) => (
              <div key={photo.id} className="min-w-0">
                {renderPhotoTile(photo)}
              </div>
            ))}
            {visiblePhotos.length === 1 && (
              <div
                className="aspect-[4/3] rounded-xl border border-dashed border-slate-700/40 bg-slate-800/20"
                aria-hidden
              />
            )}
          </div>

          {totalPages > 1 && (
            <p className="text-center text-xs text-slate-500 mt-3">
              {safePage + 1} / {totalPages}
              <span className="text-slate-600">
                {" "}
                · photos {safePage * PHOTOS_PER_PAGE + 1}–
                {Math.min((safePage + 1) * PHOTOS_PER_PAGE, filteredPhotos.length)} of{" "}
                {filteredPhotos.length}
              </span>
            </p>
          )}

          {renderActivePhotoDetails()}
        </div>
      )}

      {lightboxIndex !== null && filteredPhotos.length > 0 && (
        <MediaLightbox
          images={filteredPhotos.map((photo) => photo.image_url)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(index) => {
            setLightboxIndex(index);
            setActivePhotoId(filteredPhotos[index]?.id ?? null);
          }}
        />
      )}
    </div>
  );
}
