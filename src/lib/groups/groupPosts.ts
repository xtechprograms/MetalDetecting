import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupPostMedia } from "@/components/groups/types";

export function storagePathFromGroupMediaUrl(url: string): string | null {
  const match = url.match(/group-media\/(.+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function deleteGroupPostMediaFiles(
  supabase: SupabaseClient,
  media: GroupPostMedia[] | undefined
) {
  if (!media?.length) return;

  const paths = media
    .map((item) => storagePathFromGroupMediaUrl(item.media_url))
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  await supabase.storage.from("group-media").remove(paths);
}
