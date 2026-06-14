"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { Search, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import { AddFriendButton } from "./FriendActions";

export function CommunitySearch({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq("id", currentUserId)
      .limit(20);

    setResults(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            className="input-field pl-11"
            placeholder="Search by username or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto shrink-0" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && !loading && (
        <div className="glass-card p-8 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No detectorists found matching &quot;{query}&quot;</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  currentUserId,
}: {
  profile: Profile;
  currentUserId: string;
}) {
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${currentUserId})`
      )
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFriendStatus(data.status);
      });
  }, [currentUserId, profile.id, supabase]);

  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Link href={`/profile/${profile.username}`}>
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-14 h-14 rounded-xl object-cover border border-gold-500/20"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center font-bold text-slate-950">
            {getInitials(profile.display_name)}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${profile.username}`}
          className="font-semibold hover:text-gold-400 transition-colors"
        >
          {profile.display_name}
        </Link>
        <p className="text-sm text-slate-500">@{profile.username}</p>
        {profile.detector_brand && (
          <p className="text-xs text-slate-600 mt-1">
            {profile.detector_brand} {profile.detector_model}
          </p>
        )}
      </div>
      <AddFriendButton
        targetUserId={profile.id}
        currentUserId={currentUserId}
        existingStatus={friendStatus}
      />
    </div>
  );
}
