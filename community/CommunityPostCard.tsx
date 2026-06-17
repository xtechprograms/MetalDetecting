"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { CommunityPostComment, FeedPost } from "./types";
import { formatNotificationTime } from "@/lib/notifications";
import { getInitials } from "@/lib/utils";
import { CommunityPostAuthor } from "./CommunityPostAuthor";
import { CommunityPostMedia } from "./CommunityPostMedia";
import { Heart, Loader2, MessageCircle, Send } from "lucide-react";

type CommunityPostCardProps = {
  post: FeedPost;
  userId: string;
  highlight?: boolean;
};

export function CommunityPostCard({ post, userId, highlight = false }: CommunityPostCardProps) {
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(highlight);
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const supabase = createClient();

  const author = post.author || {
    username: "unknown",
    display_name: "Unknown",
    avatar_url: null,
  };

  useEffect(() => {
    if (!highlight) return;
    setShowComments(true);
    void loadComments();
  }, [highlight]);

  async function loadComments() {
    const { data } = await supabase
      .from("community_post_comments")
      .select(
        "*, author:profiles!user_id(username, display_name, avatar_url)"
      )
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    setComments(
      (data || []).map((row) => ({
        ...row,
        author: row.author,
      }))
    );
    setCommentsLoaded(true);
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      await loadComments();
    }
  }

  async function toggleLike() {
    if (likeLoading || post.user_id === userId) return;

    setLikeLoading(true);

    if (likedByMe) {
      await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);

      setLikedByMe(false);
      setLikeCount((count) => Math.max(count - 1, 0));
    } else {
      await supabase.from("community_post_likes").insert({
        post_id: post.id,
        user_id: userId,
      });

      setLikedByMe(true);
      setLikeCount((count) => count + 1);
    }

    setLikeLoading(false);
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = commentDraft.trim();
    if (!trimmed || commentLoading) return;

    setCommentLoading(true);

    const { data, error } = await supabase
      .from("community_post_comments")
      .insert({
        post_id: post.id,
        user_id: userId,
        content: trimmed,
      })
      .select("*, author:profiles!user_id(username, display_name, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, { ...data, author: data.author }]);
      setCommentCount((count) => count + 1);
      setCommentDraft("");
    }

    setCommentLoading(false);
  }

  return (
    <article
      id={`post-${post.id}`}
      className={`glass-card p-4 sm:p-5 scroll-mt-24 ${
        highlight ? "ring-2 ring-gold-500/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <CommunityPostAuthor profile={author} />
        <time className="text-xs text-slate-500 shrink-0">
          {formatNotificationTime(post.created_at)}
        </time>
      </div>

      {post.body && (
        <p className="mt-3 text-sm sm:text-base text-slate-200 whitespace-pre-wrap break-words">
          {post.body}
        </p>
      )}

      {post.media && post.media.length > 0 && <CommunityPostMedia media={post.media} />}

      <div className="mt-4 flex items-center gap-6 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={post.user_id === userId || likeLoading}
          className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
            likedByMe ? "text-gold-400" : "text-slate-400 hover:text-gold-400"
          } disabled:opacity-60`}
          aria-label={`Like post, ${likeCount} likes`}
        >
          <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} />
          <span className="tabular-nums">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={() => void toggleComments()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-gold-400 transition-colors"
          aria-label={`Comments, ${commentCount} comments`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="tabular-nums">{commentCount}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-slate-800 pt-4 space-y-4">
          {comments.map((comment) => {
            const commentAuthor = comment.author || {
              username: "unknown",
              display_name: "Unknown",
              avatar_url: null,
            };

            return (
              <div key={comment.id} className="flex items-start gap-3">
                <Link href={`/profile/${commentAuthor.username}`} className="shrink-0">
                  {commentAuthor.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={commentAuthor.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-gold-400">
                      {getInitials(commentAuthor.display_name)}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="rounded-xl bg-slate-900/70 px-3 py-2">
                    <Link
                      href={`/profile/${commentAuthor.username}`}
                      className="font-medium text-sm hover:text-gold-400 transition-colors"
                    >
                      {commentAuthor.display_name}
                    </Link>
                    <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatNotificationTime(comment.created_at)}
                  </p>
                </div>
              </div>
            );
          })}

          <form onSubmit={(event) => void submitComment(event)} className="flex items-center gap-2">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
            <button
              type="submit"
              disabled={commentLoading || !commentDraft.trim()}
              className="p-2 rounded-lg bg-gold-500 text-slate-950 hover:bg-gold-400 disabled:opacity-60 transition-colors"
              aria-label="Post comment"
            >
              {commentLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
