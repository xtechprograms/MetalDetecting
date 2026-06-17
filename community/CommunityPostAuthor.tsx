import Link from "next/link";
import type { Profile } from "@/types/database";
import { getInitials } from "@/lib/utils";

export function CommunityPostAuthor({
  profile,
}: {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Link href={`/profile/${profile.username}`} className="shrink-0">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-10 h-10 rounded-xl object-cover border border-slate-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-sm font-bold text-slate-950">
            {getInitials(profile.display_name)}
          </div>
        )}
      </Link>
      <div className="min-w-0">
        <Link
          href={`/profile/${profile.username}`}
          className="font-semibold text-sm hover:text-gold-400 transition-colors block truncate"
        >
          {profile.display_name}
        </Link>
        <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
      </div>
    </div>
  );
}
