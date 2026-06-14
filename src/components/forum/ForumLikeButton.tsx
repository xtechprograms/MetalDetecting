"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Heart, Loader2 } from "lucide-react";

type Props = {
  targetType: "thread" | "post";
  targetId: string;
  ownerId: string;
  currentUserId: string | null;
  initialLikeCount: number;
  initialLiked: boolean;
};

export function ForumLikeButton({
  targetType,
  targetId,
  ownerId,
  currentUserId,
  initialLikeCount,
  initialLiked,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const isOwn = currentUserId === ownerId;
  const canLike = currentUserId && !isOwn;

  async function toggleLike() {
    if (!canLike || loading) return;

    setLoading(true);
    const table = targetType === "thread" ? "forum_thread_likes" : "forum_post_likes";
    const column = targetType === "thread" ? "thread_id" : "post_id";

    if (liked) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(column, targetId)
        .eq("user_id", currentUserId);

      if (!error) {
        setLiked(false);
        setCount((c) => Math.max(c - 1, 0));
      }
    } else {
      const { error } = await supabase.from(table).insert({
        [column]: targetId,
        user_id: currentUserId,
      });

      if (!error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    }

    setLoading(false);
    router.refresh();
  }

  if (!currentUserId) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 px-2 py-1">
        <Heart className="w-4 h-4" />
        {count}
      </span>
    );
  }

  if (isOwn) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 px-2 py-1"
        title="Like count on your post"
      >
        <Heart className="w-4 h-4" />
        {count}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg transition-colors min-h-[44px] ${
        liked
          ? "text-red-400 bg-red-400/10 hover:bg-red-400/20"
          : "text-slate-400 hover:text-red-400 hover:bg-slate-800/50"
      }`}
      aria-pressed={liked}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
      )}
      {count}
    </button>
  );
}
