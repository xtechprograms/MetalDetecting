import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MessagesSquare, PlusCircle, Pin, Lock, Shield, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RoleBadge } from "@/components/forum/RoleBadge";
import { canViewModerationQueue } from "@/lib/forum/permissions";
import type { UserRole } from "@/types/database";

export const metadata = { title: "Forum" };

export default async function ForumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentRole: UserRole = "user";
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    currentRole = (me?.role as UserRole) || "user";
  }

  let pendingReports = 0;
  if (canViewModerationQueue(currentRole)) {
    const { count } = await supabase
      .from("forum_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingReports = count || 0;
  }

  const { data: categories } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order");

  const { data: recentThreads } = await supabase
    .from("forum_threads")
    .select("*, profiles(username, display_name, role)")
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="section-heading flex items-center gap-3 mb-2">
            <MessagesSquare className="w-8 h-8 text-gold-500" />
            Detectorist Forum
          </h1>
          <p className="text-slate-400">
            Discuss finds, gear, research, and connect with hunters worldwide.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:justify-end w-full sm:w-auto">
          {canViewModerationQueue(currentRole) && (
            <Link href="/forum/moderation" className="btn-secondary text-sm relative">
              <ShieldAlert className="w-4 h-4" />
              Moderation
              {pendingReports > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                  {pendingReports}
                </span>
              )}
            </Link>
          )}
          {currentRole === "admin" && (
            <Link href="/forum/admin" className="btn-secondary text-sm">
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
          {user ? (
            <Link href="/forum/new" className="btn-primary text-sm">
              <PlusCircle className="w-4 h-4" />
              New Thread
            </Link>
          ) : (
            <Link href="/login?redirect=/forum/new" className="btn-primary text-sm">
              Sign in to Post
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-display font-semibold text-slate-200 mb-4">Categories</h2>
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              href={`/forum/category/${cat.slug}`}
              className="glass-card p-4 block hover:border-gold-500/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-semibold group-hover:text-gold-400 transition-colors">
                    {cat.name}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">{cat.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-display font-semibold text-slate-200 mb-4">Recent Discussions</h2>
          <div className="space-y-3">
            {recentThreads && recentThreads.length > 0 ? (
              recentThreads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/forum/thread/${thread.id}`}
                  className="glass-card p-5 block hover:border-gold-500/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {thread.is_pinned && (
                          <Pin className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        )}
                        {thread.is_locked && (
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <h3 className="font-semibold text-slate-100 truncate">{thread.title}</h3>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{thread.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-600 flex-wrap">
                        <span>{thread.profiles?.display_name}</span>
                        <RoleBadge role={(thread.profiles?.role as UserRole) || "user"} />
                        <span>·</span>
                        <span>{thread.reply_count} replies</span>
                        <span>·</span>
                        <span>{formatDate(thread.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="glass-card p-12 text-center text-slate-400">
                <MessagesSquare className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                No threads yet — be the first to start a discussion!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
