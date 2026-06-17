"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunityPost, FeedPost } from "./types";
import type { Profile } from "@/types/database";
import { CommunityPostComposer } from "./CommunityPostComposer";
import { CommunityPostCard } from "./CommunityPostCard";
import { Loader2 } from "lucide-react";

type CommunityFeedProps = {
  userId: string;
  profile: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

function mapPosts(
  rows: Array<CommunityPost & { author?: FeedPost["author"]; media?: FeedPost["media"] }>,
  likedPostIds: Set<string>
): FeedPost[] {
  return rows.map((row) => ({
    ...row,
    likedByMe: likedPostIds.has(row.id),
  }));
}

export function CommunityFeed({ userId, profile }: CommunityFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const supabase = createClient();

  const loadFeed = useCallback(async () => {
    const { data: postRows, error } = await supabase
      .from("community_posts")
      .select(
        `
          *,
          author:profiles!user_id(username, display_name, avatar_url),
          media:community_post_media(*)
        `
      )
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
        .from("community_post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);

      likedPostIds = new Set((likes || []).map((like) => like.post_id));
    }

    setPosts(mapPosts(postRows, likedPostIds));
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    function scrollToHashPost() {
      const hash = window.location.hash;
      if (!hash.startsWith("#post-")) return;

      const postId = hash.replace("#post-", "");
      setHighlightPostId(postId);

      window.setTimeout(() => {
        document.getElementById(`post-${postId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }

    scrollToHashPost();
    window.addEventListener("hashchange", scrollToHashPost);
    return () => window.removeEventListener("hashchange", scrollToHashPost);
  }, [posts]);

  function handlePosted(post: CommunityPost) {
    setPosts((prev) => [{ ...post, likedByMe: false }, ...prev]);
  }

  return (
    <div className="w-full min-w-0">
      <CommunityPostComposer userId={userId} profile={profile} onPosted={handlePosted} />

      {loading ? (
        <div className="glass-card p-8 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-400">
          No posts yet. Be the first to share something with the community.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              userId={userId}
              highlight={highlightPostId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
