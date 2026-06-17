"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { GroupMember } from "./types";
import { getInitials } from "@/lib/utils";
import { Loader2, UserPlus } from "lucide-react";

type GroupJoinRequestsProps = {
  groupId: string;
  isGroupAdmin: boolean;
  embedded?: boolean;
};

export function GroupJoinRequests({
  groupId,
  isGroupAdmin,
  embedded = false,
}: GroupJoinRequestsProps) {
  const [requests, setRequests] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isGroupAdmin) {
      setLoading(false);
      return;
    }
    void loadRequests();
  }, [groupId, isGroupAdmin]);

  async function loadRequests() {
    const { data } = await supabase
      .from("group_members")
      .select("*, profile:profiles!user_id(username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setRequests((data as GroupMember[]) || []);
    setLoading(false);
  }

  async function respond(request: GroupMember, accept: boolean) {
    setActingId(request.id);

    if (accept) {
      const { error } = await supabase
        .from("group_members")
        .update({
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) {
        alert(error.message || "Could not approve request.");
        setActingId(null);
        return;
      }
    } else {
      const { error } = await supabase.from("group_members").delete().eq("id", request.id);

      if (error) {
        alert(error.message || "Could not decline request.");
        setActingId(null);
        return;
      }
    }

    setRequests((prev) => prev.filter((row) => row.id !== request.id));
    setActingId(null);
  }

  if (!isGroupAdmin || loading || requests.length === 0) return null;

  return (
    <div
      id="join-requests"
      className={
        embedded
          ? "p-4 sm:p-5 scroll-mt-24"
          : "glass-card p-4 sm:p-5 mb-6 scroll-mt-24"
      }
    >
      <h2 className="font-display text-base font-semibold flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-gold-400" />
        Join requests ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map((request) => {
          const profile = request.profile || {
            username: "unknown",
            display_name: "Unknown",
            avatar_url: null,
          };

          return (
            <div
              key={request.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-800/30"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Link href={`/profile/${profile.username}`} className="shrink-0">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover"
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
                    className="font-semibold text-sm hover:text-gold-400 truncate block"
                  >
                    {profile.display_name}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => void respond(request, true)}
                  disabled={actingId === request.id}
                  className="btn-primary text-sm min-h-[44px] w-full sm:w-auto justify-center"
                >
                  {actingId === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Approve"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void respond(request, false)}
                  disabled={actingId === request.id}
                  className="btn-secondary text-sm min-h-[44px] w-full sm:w-auto justify-center"
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
