export type UserRole = "user" | "mod" | "admin";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  detector_brand: string | null;
  detector_model: string | null;
  detector_type: string | null;
  avatar_url: string | null;
  location: string | null;
  years_detecting: number | null;
  role: UserRole;
  forum_thread_count: number;
  forum_post_count: number;
  find_count: number;
  created_at: string;
  updated_at: string;
};

export type ForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
};

export type ForumThread = {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  reply_count: number;
  view_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url" | "role">;
  forum_categories?: Pick<ForumCategory, "name" | "slug" | "icon">;
};

export type ForumPost = {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url" | "role" | "forum_post_count" | "find_count">;
};

export type Find = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  latitude: number | null;
  longitude: number | null;
  show_on_map: boolean;
  photo_url: string | null;
  depth_cm: number | null;
  signal_id: string | null;
  found_date: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
};

export type ResearchBookmark = {
  id: string;
  user_id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  history_summary: string | null;
  notes: string | null;
  created_at: string;
};

export type AreaHistory = {
  placeName: string;
  country: string;
  region: string;
  summary: string;
  historicalEvents: string[];
  detectingTips: string[];
  landPermissions: string;
  coordinates: { lat: number; lng: number };
};

export type DashboardStats = {
  totalFinds: number;
  mapFinds: number;
  friends: number;
  researchSites: number;
};

export type UserContributionStats = {
  find_count: number;
  forum_thread_count: number;
  forum_post_count: number;
  total_forum_activity: number;
};
