import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForumAuthor } from "@/components/forum/ForumAuthor";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ThreadModeration, PostModeration } from "@/components/forum/ModerationActions";
import { ArrowLeft, Pin, Lock } from "lucide-react";
import type { UserRole } from "@/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
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

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("*, profiles(*), forum_categories(name, slug, icon)")
    .eq("id", id)
    .single();

  if (!thread || (thread.is_deleted && currentRole === "user")) notFound();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("*, profiles(*)")
    .eq("thread_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (!user) {
    // allow read
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/forum/category/${thread.forum_categories?.slug || "general"}`}
        className="btn-ghost text-sm mb-6 inline-flex"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {thread.forum_categories?.name || "Forum"}
      </Link>

      <article className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {thread.is_pinned && (
                <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              {thread.is_locked && (
                <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-100">{thread.title}</h1>
          </div>
          {user && (
            <ThreadModeration
              threadId={thread.id}
              isPinned={thread.is_pinned}
              isLocked={thread.is_locked}
              ownerId={thread.user_id}
              currentUserId={user.id}
              currentRole={currentRole}
            />
          )}
        </div>

        {thread.profiles && (
          <ForumAuthor
            profile={{
              ...thread.profiles,
              role: thread.profiles.role || "user",
              forum_post_count: thread.profiles.forum_post_count ?? 0,
              find_count: thread.profiles.find_count ?? 0,
              forum_thread_count: thread.profiles.forum_thread_count ?? 0,
            }}
            date={thread.created_at}
          />
        )}

        <div className="mt-6 pt-6 border-t border-slate-700/50 text-slate-300 leading-relaxed whitespace-pre-wrap">
          {thread.content}
        </div>
      </article>

      <h2 className="font-display text-lg font-semibold mb-4 text-slate-200">
        Replies ({posts?.length || 0})
      </h2>

      <div className="space-y-4 mb-8">
        {posts?.map((post) => (
          <div key={post.id} className="glass-card p-5">
            <div className="flex justify-between items-start gap-4 mb-4">
              {post.profiles && (
                <ForumAuthor
                  profile={{
                    ...post.profiles,
                    role: post.profiles.role || "user",
                    forum_post_count: post.profiles.forum_post_count ?? 0,
                    find_count: post.profiles.find_count ?? 0,
                    forum_thread_count: post.profiles.forum_thread_count ?? 0,
                  }}
                  date={post.created_at}
                  showStats={false}
                />
              )}
              {user && (
                <PostModeration
                  postId={post.id}
                  currentRole={currentRole}
                  isOwner={post.user_id === user.id}
                />
              )}
            </div>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>
        ))}
      </div>

      {user ? (
        <ReplyForm threadId={thread.id} isLocked={thread.is_locked} />
      ) : (
        <div className="glass-card p-6 text-center">
          <p className="text-slate-400 mb-4">Sign in to join the discussion</p>
          <Link href={`/login?redirect=/forum/thread/${id}`} className="btn-primary">
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
