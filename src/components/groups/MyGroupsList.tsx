"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Group } from "./types";
import { Loader2, UsersRound } from "lucide-react";

type MyGroup = Group & { membershipRole: string };

export function MyGroupsList({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    void loadGroups();
  }, [userId]);

  async function loadGroups() {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, role, group:groups(*)")
      .eq("user_id", userId)
      .eq("status", "active");

    const rows =
      memberships
        ?.map((row) => {
          const group = row.group as Group | null;
          if (!group) return null;
          return { ...group, membershipRole: row.role };
        })
        .filter((row): row is MyGroup => row !== null) || [];

    setGroups(rows);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center text-slate-400 mb-6">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading your groups...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="glass-card p-6 mb-6 text-center text-slate-400">
        <UsersRound className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p>You are not in any groups yet. Create one or join an open group from search.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5 mb-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
        <UsersRound className="w-5 h-5 text-gold-400" />
        Your groups ({groups.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800/80 transition-colors"
          >
            <p className="font-semibold truncate">{group.name}</p>
            {group.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{group.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {group.member_count} members · {group.membershipRole}
              {group.join_policy === "open" ? " · Open" : " · Private"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
