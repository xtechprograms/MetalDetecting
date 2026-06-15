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
  forum_banned: boolean;
  forum_suspended_until: string | null;
  forum_moderation_reason: string | null;
  forum_moderated_by: string | null;
  forum_moderated_at: string | null;
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
  like_count: number;
  image_urls: string[];
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
  like_count: number;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url" | "role" | "forum_post_count" | "find_count">;
};

export type GalleryPhoto = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export type GalleryComment = {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url">;
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
  is_anonymous: boolean;
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

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "forum_thread_reply"
  | "forum_post_reply"
  | "forum_thread_like"
  | "forum_post_like"
  | "friend_forum_thread"
  | "friend_forum_post"
  | "friend_find";

export type FriendNotificationMute = {
  id: string;
  user_id: string;
  muted_user_id: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  friendship_id: string | null;
  thread_id: string | null;
  post_id: string | null;
  find_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  actor?: Pick<Profile, "username" | "display_name" | "avatar_url">;
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

export type GeocodedLocation = {
  lat: number;
  lng: number;
  placeName: string;
  country: string;
  postalCode?: string;
};

export type NearbyHistorySite = {
  id: string;
  title: string;
  placeName: string;
  summary: string;
  distanceKm: number;
  coordinates: { lat: number; lng: number };
  source: "wikipedia" | "nominatim";
  wikipediaUrl?: string;
};

export type NearbyHistoryResult = {
  center: GeocodedLocation;
  radiusKm: number;
  unitSystem: "metric" | "imperial";
  sites: NearbyHistorySite[];
};

export type OldMapRecord = {
  id: string;
  title: string;
  year: number;
  scale: number;
  scaleLabel: string;
  series: string;
  state?: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  viewUrl: string;
  description: string;
  source: "usgs" | "resource";
};

export type OldMapsResult = {
  location: GeocodedLocation;
  maps: OldMapRecord[];
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

export type ForumReportReason =
  | "spam"
  | "harassment"
  | "off_topic"
  | "inappropriate"
  | "other";

export type ForumReportStatus = "pending" | "reviewed" | "dismissed" | "action_taken";

export type ForumReport = {
  id: string;
  reporter_id: string;
  thread_id: string;
  post_id: string | null;
  report_type: "thread" | "post";
  reason: ForumReportReason;
  details: string | null;
  status: ForumReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  moderator_notes: string | null;
  created_at: string;
  reporter?: Pick<Profile, "username" | "display_name">;
  forum_threads?: Pick<ForumThread, "title" | "content" | "user_id"> & {
    profiles?: Pick<Profile, "username" | "display_name">;
  };
  forum_posts?: Pick<ForumPost, "content" | "user_id"> & {
    profiles?: Pick<Profile, "username" | "display_name">;
  };
};
