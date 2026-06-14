"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";
import {
  canPinOrLock,
  canSoftDeletePost,
  canDeleteThread,
} from "@/lib/forum/permissions";
import { Pin, Lock, Trash2, Loader2 } from "lucide-react";

export function ThreadModeration({
  threadId,
  isPinned,
  isLocked,
  ownerId,
  currentUserId,
  currentRole,
}: {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
  ownerId: string;
  currentUserId: string;
  currentRole: UserRole;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function updateThread(fields: Record<string, boolean>) {
    setLoading(Object.keys(fields)[0]);
    await supabase.from("forum_threads").update(fields).eq("id", threadId);
    setLoading(null);
    router.refresh();
  }

  async function softDeleteThread() {
    if (!confirm("Delete this thread?")) return;
    setLoading("delete");
    if (currentRole === "admin") {
      await supabase.from("forum_threads").delete().eq("id", threadId);
    } else {
      await supabase.from("forum_threads").update({ is_deleted: true }).eq("id", threadId);
    }
    setLoading(null);
    router.push("/forum");
    router.refresh();
  }

  if (!canPinOrLock(currentRole) && !canDeleteThread(currentRole, ownerId, currentUserId)) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canPinOrLock(currentRole) && (
        <>
          <button
            type="button"
            onClick={() => updateThread({ is_pinned: !isPinned })}
            className="btn-secondary text-xs py-1.5"
            disabled={!!loading}
          >
            {loading === "is_pinned" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Pin className="w-3 h-3" />
            )}
            {isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            onClick={() => updateThread({ is_locked: !isLocked })}
            className="btn-secondary text-xs py-1.5"
            disabled={!!loading}
          >
            {loading === "is_locked" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            {isLocked ? "Unlock" : "Lock"}
          </button>
        </>
      )}
      {canDeleteThread(currentRole, ownerId, currentUserId) && (
        <button
          type="button"
          onClick={softDeleteThread}
          className="btn-secondary text-xs py-1.5 text-red-400 border-red-800/50"
          disabled={!!loading}
        >
          {loading === "delete" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
          Delete
        </button>
      )}
    </div>
  );
}

export function PostModeration({
  postId,
  currentRole,
  isOwner,
}: {
  postId: string;
  currentRole: UserRole;
  isOwner: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  if (!isOwner && !canSoftDeletePost(currentRole)) return null;

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    setLoading(true);
    if (currentRole === "admin") {
      await supabase.from("forum_posts").delete().eq("id", postId);
    } else {
      await supabase.from("forum_posts").update({ is_deleted: true }).eq("id", postId);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="btn-ghost text-xs text-red-400 py-1"
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Delete
    </button>
  );
}
