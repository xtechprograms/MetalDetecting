import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddFriendButton } from "@/components/community/FriendActions";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { UserStatsBar } from "@/components/forum/UserStatsBar";
import type { UserRole } from "@/types/database";
import {
  MapPin,
  Compass,
  Calendar,
  Settings,
  Eye,
} from "lucide-react";
import { FIND_CATEGORIES, formatDate, formatCoordinates, getInitials } from "@/lib/utils";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("username", username)
    .single();

  return {
    title: profile?.display_name || username,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const isOwnProfile = user?.id === profile.id;

  const { data: finds } = await supabase
    .from("finds")
    .select("*")
    .eq("user_id", profile.id)
    .order("found_date", { ascending: false });

  const { count: findCount } = await supabase
    .from("finds")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id);

  let friendshipStatus: string | null = null;
  if (user && !isOwnProfile) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();
    friendshipStatus = friendship?.status || null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile Header */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-28 h-28 rounded-2xl object-cover border-2 border-gold-500/30 shadow-lg shadow-gold-500/10"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-3xl font-bold text-slate-950">
              {getInitials(profile.display_name)}
            </div>
          )}

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl font-bold gold-gradient-text">
                  {profile.display_name}
                </h1>
                <RoleBadge role={(profile.role as UserRole) || "user"} showLabel size="md" />
              </div>
              {isOwnProfile ? (
                <Link href={`/profile/${username}/edit`} className="btn-secondary text-sm py-2">
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </Link>
              ) : user ? (
                <AddFriendButton
                  targetUserId={profile.id}
                  currentUserId={user.id}
                  existingStatus={friendshipStatus}
                />
              ) : null}
            </div>

            <p className="text-slate-400 mb-4">@{profile.username}</p>

            {profile.bio && (
              <p className="text-slate-300 leading-relaxed mb-4">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gold-500" />
                  {profile.location}
                </span>
              )}
              {profile.years_detecting && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gold-500" />
                  {profile.years_detecting} years detecting
                </span>
              )}
              <span className="flex items-center gap-1">
                <Compass className="w-4 h-4 text-gold-500" />
                {profile.find_count ?? findCount ?? 0} finds logged
              </span>
            </div>

            <div className="mt-6">
              <UserStatsBar
                stats={{
                  find_count: profile.find_count ?? findCount ?? 0,
                  forum_thread_count: profile.forum_thread_count ?? 0,
                  forum_post_count: profile.forum_post_count ?? 0,
                  total_forum_activity:
                    (profile.forum_thread_count ?? 0) + (profile.forum_post_count ?? 0),
                }}
              />
            </div>

            {(profile.detector_brand || profile.detector_model || profile.detector_type) && (
              <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-xs uppercase tracking-wider text-gold-500 mb-1">Detector Setup</p>
                <p className="text-sm text-slate-300">
                  {[profile.detector_brand, profile.detector_model, profile.detector_type]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finds Gallery */}
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold mb-6">
          {isOwnProfile ? "My Finds" : `${profile.display_name}'s Finds`}
        </h2>

        {finds && finds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {finds.map((find) => {
              const cat = FIND_CATEGORIES.find((c) => c.value === find.category);
              const isVisible = isOwnProfile || find.show_on_map;

              if (!isVisible) return null;

              return (
                <div
                  key={find.id}
                  className="rounded-xl overflow-hidden bg-slate-800/30 border border-slate-700/50 hover:border-gold-500/20 transition-colors"
                >
                  {find.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={find.photo_url}
                      alt={find.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-800 flex items-center justify-center text-5xl">
                      {cat?.icon || "✨"}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{find.title}</h3>
                      {find.show_on_map && (
                        <span title="Public on map">
                          <Eye className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {cat?.label} · {formatDate(find.found_date)}
                    </p>
                    {find.latitude != null && find.longitude != null && find.show_on_map && (
                      <p className="text-xs text-slate-600 mt-1">
                        {formatCoordinates(find.latitude, find.longitude)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Compass className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            No finds logged yet
          </div>
        )}
      </div>
    </div>
  );
}
