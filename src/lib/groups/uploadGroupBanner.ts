import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadGroupBanner(
  supabase: SupabaseClient,
  groupId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Banner must be JPG, PNG, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Banner must be 5 MB or smaller." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${groupId}/banner.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("group-banners")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from("group-banners").getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}

export async function removeGroupBannerStorage(
  supabase: SupabaseClient,
  bannerUrl: string | null
) {
  if (!bannerUrl) return;

  const match = bannerUrl.match(/group-banners\/([^?]+)/);
  if (match?.[1]) {
    await supabase.storage.from("group-banners").remove([decodeURIComponent(match[1])]);
  }
}
