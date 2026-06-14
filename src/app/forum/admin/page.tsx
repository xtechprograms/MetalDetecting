import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/forum/AdminPanel";
import { isAdmin } from "@/lib/forum/permissions";
import type { UserRole } from "@/types/database";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
    .select("id, username, display_name, role, forum_post_count, find_count")
    .order("display_name");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/forum" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Back to Forum
      </Link>
      <h1 className="section-heading mb-2">Forum Administration</h1>
      <p className="text-slate-400 mb-8">Manage user roles and forum permissions.</p>
      <AdminPanel users={users || []} currentUserId={user.id} />
    </div>
  );
}
