"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GroupFeedPost } from "./types";
import type { Profile, UserRole } from "@/types/database";
import { GroupPostComposer } from "./GroupPostComposer";
import { GroupPostCard } from "./GroupPostCard";
import { Loader2 } from "lucide-react";

type GroupFeedProps = {
  groupId: string;
  userId: string;
  userRole?: UserRole;
  isGroupAdmin: boolean;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

export function GroupFeed({
  groupId,
  userId,
  userRole = "user",
  isGroupAdmin,
  profile,
}: GroupFeedProps) {
  const [posts, setPosts] = useState<GroupFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadFeed = useCallback(async () => {
    const { data: postRows, error } = await supabase
      .from("group_posts")
      .select(
        `
          *,
          author:profiles!user_id(username, display_name, avatar_url),
          media:group_post_media(*)
        `
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !postRows) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postRows.map((row) => row.id);
    let likedPostIds = new Set<string>();

    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from("group_post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);

      likedPostIds = new Set((likes || []).map((like) => like.post_id));
    }

    setPosts(
      postRows.map((row) => ({
        ...row,
        likedByMe: likedPostIds.has(row.id),
      }))
    );
    setLoading(false);
  }, [groupId, supabase, userId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  return (
    <div className="w-full min-w-0">
      <GroupPostComposer
        groupId={groupId}
        userId={userId}
        profile={profile}
        onPosted={(post) => setPosts((prev) => [{ ...post, likedByMe: false }, ...prev])}
      />
      {loading ? (
        <div className="glass-card p-8 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading group posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-400">
          No posts yet. Start the conversation with your group.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <GroupPostCard
              key={post.id}
              post={post}
              userId={userId}
              userRole={userRole}
              isGroupAdmin={isGroupAdmin}
              onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
              onUpdated={(updated) =>
                setPosts((prev) =>
                  prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
