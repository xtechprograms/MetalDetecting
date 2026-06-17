"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GroupMember } from "./types";
import {
  canDemoteGroupAdmin,
  canPromoteGroupMember,
  canRemoveGroupMember,
} from "@/lib/forum/permissions";
import { getInitials } from "@/lib/utils";
import { Loader2, Shield, UserMinus, Users } from "lucide-react";

type GroupMemberManagerProps = {
  groupId: string;
  userId: string;
  isOwner: boolean;
  isGroupAdmin: boolean;
};

export function GroupMemberManager({
  groupId,
  userId,
  isOwner,
  isGroupAdmin,
}: GroupMemberManagerProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    void loadMembers();
  }, [groupId]);

  async function loadMembers() {
    const { data } = await supabase
      .from("group_members")
      .select("*, profile:profiles!user_id(username, display_name, avatar_url)")
      .eq("group_id", groupId)
      .eq("status", "active")
      .order("role", { ascending: true });

    setMembers((data as GroupMember[]) || []);
    setLoading(false);
  }

  async function removeMember(member: GroupMember) {
    if (
      !canRemoveGroupMember(
        isOwner,
        isGroupAdmin,
        member.role,
        member.user_id,
        userId
      )
    ) {
      return;
    }

    const name = member.profile?.display_name || "this member";
    if (
      !confirm(
        `Remove ${name} from the group? They will lose access to group posts. This does not ban them from the website.`
      )
    ) {
      return;
    }

    setActingId(member.id);
    const { error } = await supabase.from("group_members").delete().eq("id", member.id);

    if (error) {
      alert(error.message || "Could not remove member.");
    } else {
      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      if (member.user_id === userId) {
        router.push("/groups");
        router.refresh();
      }
    }
    setActingId(null);
  }

  async function setMemberRole(member: GroupMember, role: "member" | "admin") {
    if (!isOwner || member.role === "owner") return;

    setActingId(member.id);
    const { error } = await supabase
      .from("group_members")
      .update({ role })
      .eq("id", member.id);

    if (error) {
      alert(error.message || "Could not update role.");
    } else {
      setMembers((prev) =>
        prev.map((row) => (row.id === member.id ? { ...row, role } : row))
      );
    }
    setActingId(null);
  }

  async function leaveGroup() {
    const self = members.find((member) => member.user_id === userId);
    if (!self || self.role === "owner") return;

    if (!confirm("Leave this group? You will lose access to its posts.")) return;

    setActingId(self.id);
    const { error } = await supabase.from("group_members").delete().eq("id", self.id);

    if (error) {
      alert(error.message);
      setActingId(null);
      return;
    }

    router.push("/groups");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="glass-card p-6 mb-6 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading members...
      </div>
    );
  }

  const self = members.find((member) => member.user_id === userId);

  return (
    <div className="glass-card p-4 sm:p-5 mb-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gold-400" />
        Members ({members.length})
      </h2>

      <div className="space-y-3">
        {members.map((member) => {
          const profile = member.profile || {
            username: "unknown",
            display_name: "Unknown",
            avatar_url: null,
          };
          const canRemove = canRemoveGroupMember(
            isOwner,
            isGroupAdmin,
            member.role,
            member.user_id,
            userId
          );
          const showRemove = canRemove && member.user_id !== userId;
          const isSelf = member.user_id === userId;

          return (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-800/30"
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
                    {isSelf ? " (you)" : ""}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">
                    @{profile.username} · {member.role}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                {canPromoteGroupMember(isOwner, member.role) && (
                  <button
                    type="button"
                    onClick={() => void setMemberRole(member, "admin")}
                    disabled={actingId === member.id}
                    className="btn-secondary text-xs min-h-[40px] px-3"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Make admin
                  </button>
                )}
                {canDemoteGroupAdmin(isOwner, member.role) && (
                  <button
                    type="button"
                    onClick={() => void setMemberRole(member, "member")}
                    disabled={actingId === member.id}
                    className="btn-secondary text-xs min-h-[40px] px-3"
                  >
                    Remove admin
                  </button>
                )}
                {showRemove && (
                  <button
                    type="button"
                    onClick={() => void removeMember(member)}
                    disabled={actingId === member.id}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs text-red-300 border border-red-900/40 hover:bg-red-950/30"
                  >
                    {actingId === member.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-3.5 h-3.5" />
                        Remove
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {self && self.role !== "owner" && (
        <button
          type="button"
          onClick={() => void leaveGroup()}
          disabled={actingId === self.id}
          className="mt-4 text-sm text-slate-400 hover:text-red-300 transition-colors"
        >
          Leave group
        </button>
      )}

      {isOwner && (
        <p className="mt-4 text-xs text-slate-500">
          Removing someone only takes them out of this group. It does not ban them from Treasure
          Atlas.
        </p>
      )}
    </div>
  );
}
