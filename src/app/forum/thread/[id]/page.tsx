import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForumAuthor } from "@/components/forum/ForumAuthor";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ThreadModeration, PostModeration } from "@/components/forum/ModerationActions";
import { ReportButton } from "@/components/forum/ReportButton";
import { ForumLikeButton } from "@/components/forum/ForumLikeButton";
import { EditableForumContent } from "@/components/forum/EditableForumContent";
import { ArrowLeft, Pin, Lock } from "lucide-react";
import type { UserRole } from "@/types/database";
import { getForumRestrictionMessage } from "@/lib/forum/permissions";

type Props = { params: Promise<{ id: string }> };

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentRole: UserRole = "user";
  let restrictionMessage: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role, forum_banned, forum_suspended_until, forum_moderation_reason")
      .eq("id", user.id)
      .maybeSingle();
    currentRole = (me?.role as UserRole) || "user";
    restrictionMessage = getForumRestrictionMessage(me);
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

  let threadLiked = false;
  const postLikeMap = new Map<string, boolean>();

  if (user) {
    const { data: threadLike } = await supabase
      .from("forum_thread_likes")
      .select("id")
      .eq("thread_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    threadLiked = !!threadLike;

    const postIds = posts?.map((p) => p.id) || [];
    if (postIds.length > 0) {
      const { data: postLikes } = await supabase
        .from("forum_post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      postLikes?.forEach((l) => postLikeMap.set(l.post_id, true));
    }
  }

  if (!user) {
    // allow read
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        href={`/forum/category/${thread.forum_categories?.slug || "general"}`}
        className="btn-ghost text-sm mb-6 inline-flex"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {thread.forum_categories?.name || "Forum"}
      </Link>

      <article className="glass-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
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
          {user && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <ReportButton
                threadId={thread.id}
                reportType="thread"
                contentOwnerId={thread.user_id}
                currentUserId={user.id}
              />
              <ThreadModeration
                threadId={thread.id}
                isPinned={thread.is_pinned}
                isLocked={thread.is_locked}
                ownerId={thread.user_id}
                currentUserId={user.id}
                currentRole={currentRole}
              />
            </div>
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

        <EditableForumContent
          mode="thread"
          id={thread.id}
          ownerId={thread.user_id}
          currentUserId={user?.id ?? null}
          title={thread.title}
          content={thread.content}
          imageUrls={thread.image_urls}
        />

        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <ForumLikeButton
            targetType="thread"
            targetId={thread.id}
            ownerId={thread.user_id}
            currentUserId={user?.id ?? null}
            initialLikeCount={thread.like_count ?? 0}
            initialLiked={threadLiked}
          />
        </div>
      </article>

      <h2 className="font-display text-lg font-semibold mb-4 text-slate-200">
        Replies ({posts?.length || 0})
      </h2>

      <div className="space-y-4 mb-8">
        {posts?.map((post) => (
          <div key={post.id} id={`post-${post.id}`} className="glass-card p-5 scroll-mt-24">
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
                <div className="flex flex-wrap items-start gap-1 shrink-0">
                  <ReportButton
                    threadId={thread.id}
                    postId={post.id}
                    reportType="post"
                    contentOwnerId={post.user_id}
                    currentUserId={user.id}
                  />
                  <PostModeration
                    postId={post.id}
                    currentRole={currentRole}
                    isOwner={post.user_id === user.id}
                  />
                </div>
              )}
            </div>
            <EditableForumContent
              mode="reply"
              id={post.id}
              ownerId={post.user_id}
              currentUserId={user?.id ?? null}
              content={post.content}
              imageUrls={post.image_urls}
            />
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <ForumLikeButton
                targetType="post"
                targetId={post.id}
                ownerId={post.user_id}
                currentUserId={user?.id ?? null}
                initialLikeCount={post.like_count ?? 0}
                initialLiked={postLikeMap.get(post.id) ?? false}
              />
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <ReplyForm
          threadId={thread.id}
          isLocked={thread.is_locked}
          restrictionMessage={restrictionMessage}
        />
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
