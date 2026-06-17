"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import type { Group, GroupMemberStatus } from "./types";
import { AddFriendButton } from "@/components/community/FriendActions";
import { getInitials } from "@/lib/utils";
import { Loader2, Search, UserPlus, UsersRound } from "lucide-react";

type DiscoverSearchProps = {
  currentUserId: string;
};

type GroupResult = Pick<Group, "id" | "name" | "description" | "member_count" | "join_policy">;

type MembershipRow = {
  group_id: string;
  status: GroupMemberStatus;
};

export function DiscoverSearch({ currentUserId }: DiscoverSearchProps) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<Set<string>>(new Set());
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(new Set());
  const [invitedGroupIds, setInvitedGroupIds] = useState<Set<string>>(new Set());
  const [pendingMembershipIds, setPendingMembershipIds] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const supabase = createClient();

  function applyMemberships(memberships: MembershipRow[] | null) {
    const active = new Set<string>();
    const pending = new Set<string>();
    const invited = new Set<string>();

    for (const row of memberships || []) {
      if (row.status === "active") active.add(row.group_id);
      if (row.status === "pending") {
        pending.add(row.group_id);
      }
      if (row.status === "invited") invited.add(row.group_id);
    }

    setMemberGroupIds(active);
    setPendingGroupIds(pending);
    setInvitedGroupIds(invited);
  }

  async function loadMemberships() {
    const { data } = await supabase
      .from("group_members")
      .select("id, group_id, status")
      .eq("user_id", currentUserId)
      .in("status", ["active", "pending", "invited"]);

    const rows = (data as (MembershipRow & { id: string })[]) || [];
    const pendingIds = new Map<string, string>();
    for (const row of rows) {
      if (row.status === "pending") {
        pendingIds.set(row.group_id, row.id);
      }
    }
    setPendingMembershipIds(pendingIds);
    applyMemberships(rows);
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);

    const [{ data: profiles }, { data: groupResults }, { data: memberships }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
          .neq("id", currentUserId)
          .limit(12),
        supabase
          .from("groups")
          .select("id, name, description, member_count, join_policy")
          .or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
          .limit(12),
        supabase
          .from("group_members")
          .select("id, group_id, status")
          .eq("user_id", currentUserId)
          .in("status", ["active", "pending", "invited"]),
      ]);

    setPeople(profiles || []);
    setGroups(groupResults || []);

    const rows = (memberships as (MembershipRow & { id: string })[]) || [];
    const pendingIds = new Map<string, string>();
    for (const row of rows) {
      if (row.status === "pending") {
        pendingIds.set(row.group_id, row.id);
      }
    }
    setPendingMembershipIds(pendingIds);
    applyMemberships(rows);
    setLoading(false);
  }

  async function joinGroup(groupId: string) {
    setActingId(groupId);

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: currentUserId,
      role: "member",
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (!error) {
      setMemberGroupIds((prev) => new Set(prev).add(groupId));
      window.location.href = `/groups/${groupId}`;
      return;
    }

    alert(error.message || "Could not join group.");
    setActingId(null);
  }

  async function requestJoin(groupId: string) {
    setActingId(groupId);

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: currentUserId,
      role: "member",
      status: "pending",
    });

    if (error) {
      alert(error.message || "Could not send join request.");
      setActingId(null);
      return;
    }

    setPendingGroupIds((prev) => new Set(prev).add(groupId));
    setActingId(null);
    await loadMemberships();
  }

  async function cancelRequest(groupId: string) {
    const membershipId = pendingMembershipIds.get(groupId);
    if (!membershipId) return;

    setActingId(groupId);

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", membershipId)
      .eq("user_id", currentUserId)
      .eq("status", "pending");

    if (error) {
      alert(error.message || "Could not cancel request.");
      setActingId(null);
      return;
    }

    setPendingGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
    setPendingMembershipIds((prev) => {
      const next = new Map(prev);
      next.delete(groupId);
      return next;
    });
    setActingId(null);
  }

  function renderGroupAction(group: GroupResult) {
    const isMember = memberGroupIds.has(group.id);
    const isPending = pendingGroupIds.has(group.id);
    const isInvited = invitedGroupIds.has(group.id);
    const busy = actingId === group.id;

    if (isMember) {
      return (
        <Link
          href={`/groups/${group.id}`}
          className="btn-secondary text-sm w-full sm:w-auto min-h-[44px] justify-center"
        >
          Open
        </Link>
      );
    }

    if (isInvited) {
      return (
        <span className="text-xs text-slate-400 w-full sm:w-auto text-center sm:text-left px-3 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-lg border border-slate-700/80">
          Invited — see above
        </span>
      );
    }

    if (isPending) {
      return (
        <button
          type="button"
          onClick={() => void cancelRequest(group.id)}
          disabled={busy}
          className="btn-secondary text-sm w-full sm:w-auto min-h-[44px] justify-center"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel request"}
        </button>
      );
    }

    if (group.join_policy === "open") {
      return (
        <button
          type="button"
          onClick={() => void joinGroup(group.id)}
          disabled={busy}
          className="btn-primary text-sm w-full sm:w-auto min-h-[44px] justify-center"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join group"}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void requestJoin(group.id)}
        disabled={busy}
        className="btn-primary text-sm w-full sm:w-auto min-h-[44px] justify-center"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request to join"}
      </button>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5 mb-6 sm:mb-8 w-full min-w-0 overflow-hidden">
      <form onSubmit={(event) => void handleSearch(event)} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
          <input
            className="input-field pl-11 text-base sm:text-sm"
            placeholder="Search people or groups..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto shrink-0 min-h-[44px]" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {searched && !loading && people.length === 0 && groups.length === 0 && (
        <p className="mt-4 text-sm text-slate-400 text-center">
          No people or groups found for &quot;{query.trim()}&quot;.
        </p>
      )}

      {people.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gold-400" />
            People
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {people.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-800/80 min-w-0"
              >
                <Link href={`/profile/${profile.username}`} className="shrink-0">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center font-bold text-slate-950 text-sm">
                      {getInitials(profile.display_name)}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${profile.username}`}
                    className="font-semibold text-sm hover:text-gold-400 truncate block"
                  >
                    {profile.display_name}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
                </div>
                <AddFriendButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  existingStatus={null}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="mt-6 min-w-0">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <UsersRound className="w-4 h-4 text-gold-400 shrink-0" />
            Groups
          </h3>
          <div className="space-y-3">
            {groups.map((group) => {
              const policyLabel =
                group.join_policy === "open"
                  ? "Public — join instantly"
                  : "Private — request to join";

              return (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-800/80 min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2 break-words">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1 break-words">
                      {group.member_count} members · {policyLabel}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto shrink-0">{renderGroupAction(group)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
