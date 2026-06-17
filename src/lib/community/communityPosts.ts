import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityPostMedia } from "@/components/community/types";

export function storagePathFromCommunityMediaUrl(url: string): string | null {
  const match = url.match(/community-media\/(.+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function deleteCommunityPostMediaFiles(
  supabase: SupabaseClient,
  media: CommunityPostMedia[] | undefined
) {
  if (!media?.length) return;

  const paths = media
    .map((item) => storagePathFromCommunityMediaUrl(item.media_url))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  await supabase.storage.from("community-media").remove(paths);
}
