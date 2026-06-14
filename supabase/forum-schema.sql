-- Treasure Atlas Forum + Roles
-- Run in Supabase SQL Editor AFTER the main schema.sql

-- ============================================================
-- ROLES: user | mod | admin
-- user:  create/edit/delete own posts & threads
-- mod:   + pin/lock threads, soft-delete any post/thread, edit mod notes
-- admin: + delete any content, manage categories, assign mod/admin roles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'mod', 'admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forum_thread_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forum_post_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS find_count INTEGER NOT NULL DEFAULT 0;

-- Make yourself admin (change the username!):
-- UPDATE public.profiles SET role = 'admin' WHERE username = 'your_username';

-- Role helper functions (used by RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_mod_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('mod', 'admin');
$$;

-- ============================================================
-- FORUM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON public.forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON public.forum_posts(user_id);

-- Seed categories
INSERT INTO public.forum_categories (name, slug, description, icon, sort_order) VALUES
  ('General Discussion', 'general', 'Talk about anything metal detecting related', '🌍', 1),
  ('Finds & Showcases', 'finds', 'Share and discuss your discoveries', '🏆', 2),
  ('Equipment & Tech', 'equipment', 'Detectors, coils, pinpointers, and gear talk', '⚙️', 3),
  ('Research & Sites', 'research', 'Historical research, permissions, and site tips', '📜', 4),
  ('Meetups & Events', 'events', 'Organize hunts and connect locally', '📍', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STAT COUNTERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_find_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET find_count = find_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET find_count = GREATEST(find_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_find_count_change ON public.finds;
CREATE TRIGGER on_find_count_change
  AFTER INSERT OR DELETE ON public.finds
  FOR EACH ROW EXECUTE FUNCTION public.sync_find_count();

-- Backfill find counts
UPDATE public.profiles p
SET find_count = (SELECT COUNT(*) FROM public.finds f WHERE f.user_id = p.id);

CREATE OR REPLACE FUNCTION public.sync_forum_thread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE public.profiles SET forum_thread_count = forum_thread_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE public.profiles SET forum_thread_count = GREATEST(forum_thread_count - 1, 0) WHERE id = NEW.user_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE public.profiles SET forum_thread_count = forum_thread_count + 1 WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    UPDATE public.profiles SET forum_thread_count = GREATEST(forum_thread_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_forum_thread_count ON public.forum_threads;
CREATE TRIGGER on_forum_thread_count
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_thread_count();

CREATE OR REPLACE FUNCTION public.sync_forum_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE public.profiles SET forum_post_count = forum_post_count + 1 WHERE id = NEW.user_id;
    UPDATE public.forum_threads
      SET reply_count = reply_count + 1,
          last_reply_at = NEW.created_at,
          updated_at = NOW()
      WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE public.profiles SET forum_post_count = GREATEST(forum_post_count - 1, 0) WHERE id = NEW.user_id;
      UPDATE public.forum_threads SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = NEW.thread_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE public.profiles SET forum_post_count = forum_post_count + 1 WHERE id = NEW.user_id;
      UPDATE public.forum_threads SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND NOT OLD.is_deleted THEN
    UPDATE public.profiles SET forum_post_count = GREATEST(forum_post_count - 1, 0) WHERE id = OLD.user_id;
    UPDATE public.forum_threads SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_forum_post_count ON public.forum_posts;
CREATE TRIGGER on_forum_post_count
  AFTER INSERT OR UPDATE OR DELETE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_post_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Categories: everyone reads, admin manages
DROP POLICY IF EXISTS "Anyone can view categories" ON public.forum_categories;
CREATE POLICY "Anyone can view categories"
  ON public.forum_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.forum_categories;
CREATE POLICY "Admins manage categories"
  ON public.forum_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Threads
DROP POLICY IF EXISTS "View non-deleted threads" ON public.forum_threads;
CREATE POLICY "View non-deleted threads"
  ON public.forum_threads FOR SELECT
  USING (NOT is_deleted OR user_id = auth.uid() OR public.is_mod_or_admin());

DROP POLICY IF EXISTS "Authenticated users create threads" ON public.forum_threads;
CREATE POLICY "Authenticated users create threads"
  ON public.forum_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users edit own threads" ON public.forum_threads;
CREATE POLICY "Users edit own threads"
  ON public.forum_threads FOR UPDATE
  USING (
    (auth.uid() = user_id AND NOT is_deleted)
    OR public.is_mod_or_admin()
  );

DROP POLICY IF EXISTS "Admins delete threads" ON public.forum_threads;
CREATE POLICY "Admins delete threads"
  ON public.forum_threads FOR DELETE
  USING (public.is_admin() OR auth.uid() = user_id);

-- Posts
DROP POLICY IF EXISTS "View non-deleted posts" ON public.forum_posts;
CREATE POLICY "View non-deleted posts"
  ON public.forum_posts FOR SELECT
  USING (NOT is_deleted OR user_id = auth.uid() OR public.is_mod_or_admin());

DROP POLICY IF EXISTS "Authenticated users create posts" ON public.forum_posts;
CREATE POLICY "Authenticated users create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND NOT t.is_locked AND NOT t.is_deleted
    )
  );

DROP POLICY IF EXISTS "Users edit own posts" ON public.forum_posts;
CREATE POLICY "Users edit own posts"
  ON public.forum_posts FOR UPDATE
  USING (
    (auth.uid() = user_id AND NOT is_deleted)
    OR public.is_mod_or_admin()
  );

DROP POLICY IF EXISTS "Admins delete posts" ON public.forum_posts;
CREATE POLICY "Admins delete posts"
  ON public.forum_posts FOR DELETE
  USING (public.is_admin() OR auth.uid() = user_id);

-- Role changes use admin_set_user_role RPC (admins only)

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  IF new_role NOT IN ('user', 'mod', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role TO authenticated;

-- Re-apply simple profile update policy for non-role fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
