import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/forum/AdminPanel";
import { isAdmin } from "@/lib/forum/permissions";
import type { UserRole } from "@/types/database";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = { title: "Forum Admin" };

export default async function ForumAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/forum/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) || "user";
  if (!isAdmin(role)) notFound();

  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, role, forum_post_count, find_count, forum_banned, forum_suspended_until, forum_moderation_reason"
    )
    .order("display_name");

  const moderators = (users || []).filter((u) => u.role === "mod");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/forum" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Back to Forum
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-heading mb-2">Forum Administration</h1>
          <p className="text-slate-400">Manage user roles, ban or suspend users, and forum permissions.</p>
        </div>
        <Link href="/forum/moderation" className="btn-secondary text-sm">
          <ShieldAlert className="w-4 h-4" />
          Moderation Queue
        </Link>
      </div>
      <AdminPanel users={users || []} currentUserId={user.id} moderators={moderators} />
    </div>
  );
}
