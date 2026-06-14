"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { Loader2, Shield, Star, UserX } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

type ModUser = Pick<Profile, "id" | "username" | "display_name">;

export function AdminPanel({
  users,
  currentUserId,
  moderators = [],
}: {
  users: Pick<Profile, "id" | "username" | "display_name" | "role" | "forum_post_count" | "find_count">[];
  currentUserId: string;
  moderators?: ModUser[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function setRole(userId: string, role: UserRole) {
    setLoading(userId);
    setMessage(null);
    const { error } = await supabase.rpc("admin_set_user_role", {
      target_user_id: userId,
      new_role: role,
    });
    if (error) setMessage(error.message);
    else setMessage("Role updated successfully");
    setLoading(null);
    router.refresh();
  }

  async function revokeModerator(userId: string, displayName: string) {
    if (
      !confirm(
        `Revoke moderator permissions from ${displayName}? They will immediately lose all mod powers.`
      )
    ) {
      return;
    }

    setRevoking(userId);
    setMessage(null);

    const { error } = await supabase.rpc("admin_revoke_moderator", {
      target_user_id: userId,
    });

    if (error) setMessage(error.message);
    else setMessage(`${displayName} is no longer a moderator`);
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold gold-gradient-text flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5" />
          Role Permissions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-400 mt-4">
          <div className="p-4 rounded-xl bg-slate-800/40">
            <p className="font-semibold text-slate-200 flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 text-gold-400 fill-gold-400" /> Admin
            </p>
            <ul className="space-y-1 text-xs">
              <li>• All mod powers</li>
              <li>• Assign & revoke roles</li>
              <li>• Manage categories</li>
              <li>• Permanently delete content</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40">
            <p className="font-semibold text-slate-200 flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 text-slate-300 fill-slate-400" /> Mod
            </p>
            <ul className="space-y-1 text-xs">
              <li>• Pin & lock threads</li>
              <li>• Remove posts/threads</li>
              <li>• Review reported content</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40">
            <p className="font-semibold text-slate-200 mb-2">User</p>
            <ul className="space-y-1 text-xs">
              <li>• Create threads & replies</li>
              <li>• Report inappropriate content</li>
              <li>• Log finds & research</li>
            </ul>
          </div>
        </div>
      </div>

      {moderators.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-400" />
            Revoke Moderator Access
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Use this if a moderator abuses their permissions. They will be demoted to a regular user.
          </p>
          <div className="space-y-3">
            {moderators.map((mod) => (
              <div
                key={mod.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-800/30"
              >
                <div>
                  <Link href={`/profile/${mod.username}`} className="font-semibold hover:text-gold-400">
                    {mod.display_name}
                  </Link>
                  <p className="text-xs text-slate-500">@{mod.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeModerator(mod.id, mod.display_name)}
                  disabled={revoking === mod.id}
                  className="btn-secondary text-sm text-red-400 border-red-800/50 w-full sm:w-auto min-h-[44px]"
                >
                  {revoking === mod.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Revoke Mod Permissions"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="glass-card p-4 text-sm text-gold-300 border border-gold-500/30">
          {message}
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Manage Users</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-slate-800/30"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-sm font-bold text-slate-950 shrink-0">
                  {getInitials(user.display_name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/profile/${user.username}`} className="font-semibold hover:text-gold-400">
                      {user.display_name}
                    </Link>
                    <RoleBadge role={user.role || "user"} showLabel />
                  </div>
                  <p className="text-xs text-slate-500">
                    @{user.username} · {user.find_count ?? 0} finds · {user.forum_post_count ?? 0} posts
                  </p>
                </div>
              </div>
              {user.id !== currentUserId && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
                    {(["user", "mod", "admin"] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRole(user.id, role)}
                        disabled={loading === user.id || user.role === role}
                        className={`btn-secondary text-xs sm:text-sm py-2 px-3 capitalize flex-1 sm:flex-none min-h-[44px] ${
                          user.role === role ? "border-gold-500/50 text-gold-400" : ""
                        }`}
                      >
                        {loading === user.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          role
                        )}
                      </button>
                    ))}
                  </div>
                  {user.role === "mod" && (
                    <button
                      type="button"
                      onClick={() => revokeModerator(user.id, user.display_name)}
                      disabled={revoking === user.id}
                      className="btn-secondary text-xs sm:text-sm text-red-400 border-red-800/50 w-full min-h-[44px]"
                    >
                      {revoking === user.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Revoke Mod"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
