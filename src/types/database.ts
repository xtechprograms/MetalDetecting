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
  created_at: string;
  updated_at: string;
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
