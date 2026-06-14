"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types/database";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { Loader2, Shield, Star } from "lucide-react";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

export function AdminPanel({
  users,
  currentUserId,
}: {
  users: Pick<Profile, "id" | "username" | "display_name" | "role" | "forum_post_count" | "find_count">[];
  currentUserId: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
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
              <li>• Assign roles</li>
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
              <li>• Moderate forum content</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40">
            <p className="font-semibold text-slate-200 mb-2">User</p>
            <ul className="space-y-1 text-xs">
              <li>• Create threads & replies</li>
              <li>• Edit own content</li>
              <li>• Log finds & research</li>
            </ul>
          </div>
        </div>
      </div>

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
                  <div className="flex items-center gap-2">
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
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
