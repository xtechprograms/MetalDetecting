"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { getInitials } from "@/lib/utils";
import { Users } from "lucide-react";

type FriendProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "location"
>;

export function FriendsList({
  userId,
  showEmpty = false,
}: {
  userId: string;
  showEmpty?: boolean;
}) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadFriends() {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (!friendships?.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, location")
        .in("id", friendIds);

      setFriends(profiles ?? []);
      setLoading(false);
    }

    loadFriends();
  }, [userId]);

  if (loading) return null;

  if (friends.length === 0) {
    if (!showEmpty) return null;

    return (
      <div className="glass-card p-6 mb-8">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gold-400" />
          Your Friends
        </h2>
        <p className="text-slate-400 text-sm mb-4">You have not added any friends yet.</p>
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 transition-colors"
        >
          Find detectorists in Community
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gold-400" />
        Your Friends ({friends.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {friends.map((friend) => (
          <Link
            key={friend.id}
            href={`/profile/${friend.username}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
          >
            {friend.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={friend.avatar_url}
                alt={friend.display_name}
                className="w-11 h-11 rounded-xl object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center font-bold text-slate-950 text-sm">
                {getInitials(friend.display_name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{friend.display_name}</p>
              <p className="text-xs text-slate-500 truncate">
                @{friend.username}
                {friend.location ? ` · ${friend.location}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
