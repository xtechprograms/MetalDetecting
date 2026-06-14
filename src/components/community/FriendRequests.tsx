"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { FriendRequestActions } from "./FriendActions";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { Bell } from "lucide-react";

type PendingRequest = {
  id: string;
  requester: Profile;
};

export function FriendRequests({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function loadRequests() {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("id, requester_id")
        .eq("addressee_id", userId)
        .eq("status", "pending");

      if (!friendships?.length) {
        setRequests([]);
        return;
      }

      const requesterIds = friendships.map((f) => f.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", requesterIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setRequests(
        friendships
          .map((f) => {
            const requester = profileMap.get(f.requester_id);
            if (!requester) return null;
            return { id: f.id, requester };
          })
          .filter((r): r is PendingRequest => r !== null)
      );
    }

    loadRequests();
  }, [userId]);

  if (requests.length === 0) return null;

  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-gold-400" />
        Friend Requests ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map(({ id, requester }) => (
          <div
            key={id}
            className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30"
          >
            <Link href={`/profile/${requester.username}`}>
              {requester.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={requester.avatar_url}
                  alt={requester.display_name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center font-bold text-slate-950 text-sm">
                  {getInitials(requester.display_name)}
                </div>
              )}
            </Link>
            <div className="flex-1">
              <Link
                href={`/profile/${requester.username}`}
                className="font-semibold hover:text-gold-400"
              >
                {requester.display_name}
              </Link>
              <p className="text-sm text-slate-500">@{requester.username}</p>
            </div>
            <FriendRequestActions
              friendshipId={id}
              onAccept={() => setRequests((r) => r.filter((req) => req.id !== id))}
              onDecline={() => setRequests((r) => r.filter((req) => req.id !== id))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
