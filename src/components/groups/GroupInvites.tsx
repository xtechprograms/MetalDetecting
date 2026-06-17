"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupInvite } from "./types";
import { Loader2, Mail } from "lucide-react";

export function GroupInvites({ userId }: { userId: string }) {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    void loadInvites();
  }, [userId]);

  async function loadInvites() {
    const { data } = await supabase
      .from("group_members")
      .select(
        `
          *,
          group:groups(id, name, description, member_count),
          inviter:profiles!invited_by(username, display_name, avatar_url)
        `
      )
      .eq("user_id", userId)
      .eq("status", "invited")
      .order("created_at", { ascending: false });

    setInvites((data as GroupInvite[]) || []);
    setLoading(false);
  }

  async function respond(membershipId: string, accept: boolean) {
    setActingId(membershipId);

    if (accept) {
      const { error } = await supabase
        .from("group_members")
        .update({
          status: "active",
          joined_at: new Date().toISOString(),
        })
        .eq("id", membershipId)
        .eq("user_id", userId);

      if (error) {
        alert(error.message);
        setActingId(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", membershipId)
        .eq("user_id", userId);

      if (error) {
        alert(error.message);
        setActingId(null);
        return;
      }
    }

    setInvites((prev) => prev.filter((invite) => invite.id !== membershipId));
    setActingId(null);

    if (accept) {
      const invite = invites.find((item) => item.id === membershipId);
      if (invite?.group_id) {
        window.location.href = `/groups/${invite.group_id}`;
      }
    }
  }

  if (loading || invites.length === 0) return null;

  return (
    <div className="glass-card p-4 sm:p-5 mb-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-gold-400" />
        Group invitations ({invites.length})
      </h2>
      <div className="space-y-3">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-800/30"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{invite.group?.name || "Group invite"}</p>
              {invite.group?.description && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{invite.group.description}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Invited by {invite.inviter?.display_name || "a member"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void respond(invite.id, true)}
                disabled={actingId === invite.id}
                className="btn-primary text-sm min-h-[44px]"
              >
                {actingId === invite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => void respond(invite.id, false)}
                disabled={actingId === invite.id}
                className="btn-secondary text-sm min-h-[44px]"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
