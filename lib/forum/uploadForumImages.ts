import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadForumImages(
  supabase: SupabaseClient,
  userId: string,
  files: File[]
): Promise<{ urls: string[]; error?: string }> {
  if (files.length === 0) return { urls: [] };
  if (files.length > MAX_FILES) {
    return { urls: [], error: `Maximum ${MAX_FILES} images per post` };
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { urls: [], error: "Images must be JPG, PNG, WebP, or GIF" };
    }
    if (file.size > MAX_BYTES) {
      return { urls: [], error: "Each image must be 5 MB or smaller" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("forum-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return { urls: [], error: uploadError.message };
    }

    const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return { urls };
}

export const FORUM_IMAGE_LIMITS = { maxFiles: MAX_FILES, maxBytes: MAX_BYTES };
