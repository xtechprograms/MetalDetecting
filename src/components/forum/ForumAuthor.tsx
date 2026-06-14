import Link from "next/link";
import type { Profile } from "@/types/database";
import { RoleBadge } from "./RoleBadge";
import { UserStatsBar } from "./UserStatsBar";
import { getInitials, formatDate } from "@/lib/utils";

export function ForumAuthor({
  profile,
  date,
  showStats = true,
}: {
  profile: Pick<
    Profile,
    | "username"
    | "display_name"
    | "avatar_url"
    | "role"
    | "forum_post_count"
    | "find_count"
    | "forum_thread_count"
  >;
  date?: string;
  showStats?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Link href={`/profile/${profile.username}`}>
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
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/profile/${profile.username}`}
            className="font-semibold text-sm hover:text-gold-400 transition-colors"
          >
            {profile.display_name}
          </Link>
          <RoleBadge role={profile.role || "user"} />
        </div>
        <p className="text-xs text-slate-500">@{profile.username}</p>
        {date && (
          <p className="text-xs text-slate-600 mt-0.5">{formatDate(date)}</p>
        )}
        {showStats && (
          <div className="mt-2">
            <UserStatsBar
              compact
              stats={{
                find_count: profile.find_count ?? 0,
                forum_thread_count: profile.forum_thread_count ?? 0,
                forum_post_count: profile.forum_post_count ?? 0,
                total_forum_activity:
                  (profile.forum_thread_count ?? 0) + (profile.forum_post_count ?? 0),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
