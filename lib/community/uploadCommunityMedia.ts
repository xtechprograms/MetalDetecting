import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityPostMediaType } from "@/types/database";

const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export type UploadedCommunityMedia = {
  media_url: string;
  media_type: CommunityPostMediaType;
  sort_order: number;
};

export async function uploadCommunityMedia(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<{ media: UploadedCommunityMedia[]; error?: string }> {
  if (files.length === 0) return { media: [] };

  const images = files.filter((file) => IMAGE_TYPES.includes(file.type));
  const videos = files.filter((file) => VIDEO_TYPES.includes(file.type));
  const unknown = files.filter(
    (file) => !IMAGE_TYPES.includes(file.type) && !VIDEO_TYPES.includes(file.type)
  );

  if (unknown.length > 0) {
    return { media: [], error: "Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV files." };
  }
  if (images.length > MAX_IMAGES) {
    return { media: [], error: `Maximum ${MAX_IMAGES} photos per post.` };
  }
  if (videos.length > MAX_VIDEOS) {
    return { media: [], error: `Maximum ${MAX_VIDEOS} videos per post.` };
  }

  const media: UploadedCommunityMedia[] = [];
  let sortOrder = 0;

  for (const file of files) {
    const isVideo = VIDEO_TYPES.includes(file.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (file.size > maxBytes) {
      return {
        media: [],
        error: isVideo
          ? "Each video must be 50 MB or smaller."
          : "Each photo must be 8 MB or smaller.",
      };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("community-media")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return { media: [], error: uploadError.message };
    }

    const { data } = supabase.storage.from("community-media").getPublicUrl(path);
    media.push({
      media_url: data.publicUrl,
      media_type: isVideo ? "video" : "image",
      sort_order: sortOrder++,
    });
  }

  return { media };
}

export const COMMUNITY_MEDIA_LIMITS = {
  maxImages: MAX_IMAGES,
  maxVideos: MAX_VIDEOS,
  maxImageBytes: MAX_IMAGE_BYTES,
  maxVideoBytes: MAX_VIDEO_BYTES,
  imageTypes: IMAGE_TYPES,
  videoTypes: VIDEO_TYPES,
};
