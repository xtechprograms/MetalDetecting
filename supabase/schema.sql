-- Treasure Atlas | Migration 1 of 17: schema.sql
-- Prerequisites: none (run first on a new Supabase project)
-- Purpose: Profiles, finds, friendships, bookmarks, RLS, find photo storage
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  detector_brand TEXT,
  detector_model TEXT,
  detector_type TEXT,
  avatar_url TEXT,
  location TEXT,
  years_detecting INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finds
CREATE TABLE IF NOT EXISTS finds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  show_on_map BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  depth_cm INTEGER,
  signal_id TEXT,
  found_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Research bookmarks
CREATE TABLE IF NOT EXISTS research_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION DEFAULT 5,
  history_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finds_user_id ON finds(user_id);
CREATE INDEX IF NOT EXISTS idx_finds_show_on_map ON finds(show_on_map) WHERE show_on_map = true;
CREATE INDEX IF NOT EXISTS idx_finds_location ON finds(latitude, longitude) WHERE show_on_map = true;
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER finds_updated_at BEFORE UPDATE ON finds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    lower(COALESCE(NEW.raw_user_meta_data->>'username', 'detectorist_' || substr(NEW.id::text, 1, 8))),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Detectorist')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_bookmarks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Finds policies
CREATE POLICY "Public map finds are viewable by everyone"
  ON finds FOR SELECT USING (show_on_map = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own finds"
  ON finds FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finds"
  ON finds FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finds"
  ON finds FOR DELETE USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Research bookmarks policies
CREATE POLICY "Users can view own bookmarks"
  ON research_bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON research_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON research_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for find photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('find-photos', 'find-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view find photos"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('find-photos', 'avatars'));

CREATE POLICY "Authenticated users can upload find photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('find-photos', 'avatars')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
