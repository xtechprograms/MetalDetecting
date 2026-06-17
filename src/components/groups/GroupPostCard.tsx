"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { deleteGroupPostMediaFiles } from "@/lib/groups/groupPosts";
import type { GroupPostComment, GroupFeedPost } from "./types";
import type { CommunityPostMedia } from "@/components/community/types";
import type { UserRole } from "@/types/database";
import { formatNotificationTime } from "@/lib/notifications";
import {
  canDeleteGroupPost,
  canEditGroupPost,
} from "@/lib/forum/permissions";
import { getInitials } from "@/lib/utils";
import { CommunityPostAuthor } from "@/components/community/CommunityPostAuthor";
import { CommunityPostMedia } from "@/components/community/CommunityPostMedia";
import { Heart, Loader2, MessageCircle, Pencil, Send, Trash2, X } from "lucide-react";

type GroupPostCardProps = {
  post: GroupFeedPost;
  userId: string;
  userRole?: UserRole;
  isGroupAdmin: boolean;
  onDeleted?: (postId: string) => void;
  onUpdated?: (post: GroupFeedPost) => void;
};

export function GroupPostCard({
  post,
  userId,
  userRole = "user",
  isGroupAdmin,
  onDeleted,
  onUpdated,
}: GroupPostCardProps) {
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [body, setBody] = useState(post.body || "");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.body || "");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<GroupPostComment[]>([]);
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

  const canEdit = canEditGroupPost(post.user_id, userId);
  const canDelete = canDeleteGroupPost(userRole, post.user_id, userId, isGroupAdmin);
  const isModeratorDelete = canDelete && post.user_id !== userId;

  useEffect(() => {
    setBody(post.body || "");
    setEditDraft(post.body || "");
  }, [post.body, post.id]);

  async function loadComments() {
    const { data } = await supabase
      .from("group_post_comments")
      .select("*, author:profiles!user_id(username, display_name, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    setComments((data as GroupPostComment[]) || []);
    setCommentsLoaded(true);
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) await loadComments();
  }

  async function toggleLike() {
    if (likeLoading || post.user_id === userId) return;
    setLikeLoading(true);

    if (likedByMe) {
      await supabase
        .from("group_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
      setLikedByMe(false);
      setLikeCount((count) => Math.max(count - 1, 0));
    } else {
      await supabase.from("group_post_likes").insert({ post_id: post.id, user_id: userId });
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
      .from("group_post_comments")
      .insert({ post_id: post.id, user_id: userId, content: trimmed })
      .select("*, author:profiles!user_id(username, display_name, avatar_url)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as GroupPostComment]);
      setCommentCount((count) => count + 1);
      setCommentDraft("");
    }
    setCommentLoading(false);
  }

  async function saveEdit() {
    const trimmed = editDraft.trim();
    const hasMedia = (post.media?.length ?? 0) > 0;
    if (!trimmed && !hasMedia) {
      setEditError("Add text or keep at least one photo/video on the post.");
      return;
    }

    setEditLoading(true);
    const { data, error } = await supabase
      .from("group_posts")
      .update({ body: trimmed || null, updated_at: new Date().toISOString() })
      .eq("id", post.id)
      .select("*")
      .single();

    if (error || !data) {
      setEditError(error?.message || "Could not update post.");
      setEditLoading(false);
      return;
    }

    setBody(data.body || "");
    setEditing(false);
    setEditLoading(false);
    onUpdated?.({ ...post, ...data, body: data.body, likedByMe });
  }

  async function handleDelete() {
    if (deleteLoading) return;
    const message = isModeratorDelete
      ? "Delete this post from the group? This cannot be undone."
      : "Delete your post? This cannot be undone.";
    if (!confirm(message)) return;

    setDeleteLoading(true);
    await deleteGroupPostMediaFiles(supabase, post.media);
    const { error } = await supabase.from("group_posts").delete().eq("id", post.id);

    if (error) {
      alert(error.message || "Could not delete post.");
      setDeleteLoading(false);
      return;
    }
    onDeleted?.(post.id);
  }

  return (
    <article className="glass-card p-3 sm:p-5 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 min-w-0">
        <CommunityPostAuthor profile={author} />
        <div className="flex items-center gap-2 shrink-0 pl-[3.25rem] sm:pl-0">
          <time className="text-xs text-slate-500">{formatNotificationTime(post.created_at)}</time>
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-1">
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditDraft(body);
                    setEditing(true);
                  }}
                  className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-lg text-slate-400 hover:text-gold-400 hover:bg-slate-800/60"
                  aria-label="Edit post"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleteLoading}
                  className="inline-flex items-center justify-center min-h-9 min-w-9 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 disabled:opacity-60"
                  aria-label="Delete post"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={editDraft}
            onChange={(event) => setEditDraft(event.target.value)}
            rows={4}
            className="w-full min-w-0 rounded-xl bg-slate-900/70 border border-slate-700 px-3 sm:px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-y min-h-[88px]"
          />
          {editError && <p className="text-sm text-red-400">{editError}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveEdit()} disabled={editLoading} className="btn-primary text-sm min-h-[44px]">
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditDraft(body);
              }}
              className="btn-secondary text-sm min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        body && (
          <p className="mt-3 text-sm sm:text-base text-slate-200 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {body}
          </p>
        )
      )}

      {post.media && post.media.length > 0 && (
        <CommunityPostMedia media={post.media as CommunityPostMedia[]} />
      )}

      <div className="mt-4 flex items-center gap-4 sm:gap-6 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={post.user_id === userId || likeLoading}
          className={`inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm ${
            likedByMe ? "text-gold-400" : "text-slate-400 hover:text-gold-400"
          }`}
        >
          <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => void toggleComments()}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm text-slate-400 hover:text-gold-400"
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
                    <img src={commentAuthor.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-gold-400">
                      {getInitials(commentAuthor.display_name)}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="rounded-xl bg-slate-900/70 px-3 py-2">
                    <Link href={`/profile/${commentAuthor.username}`} className="font-medium text-sm hover:text-gold-400">
                      {commentAuthor.display_name}
                    </Link>
                    <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <form onSubmit={(event) => void submitComment(event)} className="flex items-stretch sm:items-center gap-2 min-w-0">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-w-0 rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2.5 min-h-[44px] text-sm text-slate-100"
            />
            <button type="submit" disabled={commentLoading || !commentDraft.trim()} className="btn-primary min-h-[44px] min-w-[44px] p-2">
              {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
