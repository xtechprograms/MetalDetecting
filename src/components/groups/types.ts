export type GroupJoinPolicy = "invite_only" | "open";

export type GroupMemberRole = "owner" | "admin" | "member";

export type GroupMemberStatus = "active" | "invited" | "pending";

export type GroupPostMediaType = "image" | "video";

export type GroupPostAuthor = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  created_by: string;
  join_policy: GroupJoinPolicy;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  profile?: GroupPostAuthor;
};

export type GroupPostMedia = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: GroupPostMediaType;
  sort_order: number;
  created_at: string;
};

export type GroupPost = {
  id: string;
  group_id: string;
  user_id: string;
  body: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: GroupPostAuthor;
  media?: GroupPostMedia[];
};

export type GroupPostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: GroupPostAuthor;
};

export type GroupFeedPost = GroupPost & {
  likedByMe: boolean;
};

export type GroupInvite = GroupMember & {
  group?: Pick<Group, "id" | "name" | "description" | "member_count">;
  inviter?: GroupPostAuthor;
};
