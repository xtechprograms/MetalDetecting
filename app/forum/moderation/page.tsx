import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ModerationQueue } from "@/components/forum/ModerationQueue";
import { canViewModerationQueue } from "@/lib/forum/permissions";
import type { ForumReport, UserRole } from "@/types/database";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = { title: "Moderation Queue" };

export default async function ModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/forum/moderation");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) || "user";
  if (!canViewModerationQueue(role)) notFound();

  const { data: reports } = await supabase
    .from("forum_reports")
    .select(
      `
      *,
      reporter:profiles!forum_reports_reporter_id_fkey(username, display_name),
      forum_threads(title, content, user_id, profiles(username, display_name)),
      forum_posts(content, user_id, profiles(username, display_name))
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  let moderators: Array<{ id: string; username: string; display_name: string }> = [];
  if (role === "admin") {
    const { data: modUsers } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("role", "mod")
      .order("display_name");
    moderators = modUsers || [];
  }

  const normalizedReports = (reports || []) as ForumReport[];

  const pendingCount = normalizedReports.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/forum" className="btn-ghost text-sm mb-6 inline-flex">
        <ArrowLeft className="w-4 h-4" />
        Back to Forum
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="section-heading flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
            Moderation Queue
          </h1>
          <p className="text-slate-400">
            Review user reports and take action on forum content.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      <ModerationQueue
        reports={normalizedReports}
        currentUserId={user.id}
        currentRole={role}
        showRevokeMod={role === "admin"}
        moderators={moderators}
      />
    </div>
  );
}
