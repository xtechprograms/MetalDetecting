export type CommunityPostMediaType = "image" | "video";

export type CommunityPostAuthor = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type CommunityPostMedia = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: CommunityPostMediaType;
  sort_order: number;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  body: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: CommunityPostAuthor;
  media?: CommunityPostMedia[];
};

export type CommunityPostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: CommunityPostAuthor;
};

export type FeedPost = CommunityPost & {
  likedByMe: boolean;
};
