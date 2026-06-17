-- Treasure Atlas | Migration 20 of 20: community-feed.sql
-- Prerequisites: friend-activity-notifications.sql (step 10), notifications.sql (step 9)
-- Purpose: Community feed posts, media, likes, comments, and interaction notifications
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

-- ============================================================
-- COMMUNITY FEED TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    body IS NULL OR char_length(trim(body)) >= 1
  )
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON public.community_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_user
  ON public.community_posts(user_id);

CREATE TABLE IF NOT EXISTS public.community_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_media_post
  ON public.community_post_media(post_id, sort_order);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_post
  ON public.community_post_likes(post_id);

CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post
  ON public.community_post_comments(post_id, created_at ASC);

-- ============================================================
-- COUNT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_community_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_community_post_like_count ON public.community_post_likes;
CREATE TRIGGER on_community_post_like_count
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_post_like_count();

CREATE OR REPLACE FUNCTION public.sync_community_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_community_post_comment_count ON public.community_post_comments;
CREATE TRIGGER on_community_post_comment_count
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_post_comment_count();

-- ============================================================
-- NOTIFICATIONS: NEW COLUMNS + TYPES
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS community_post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS community_comment_id UUID REFERENCES public.community_post_comments(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'forum_thread_reply',
    'forum_post_reply',
    'forum_thread_like',
    'forum_post_like',
    'friend_forum_thread',
    'friend_forum_post',
    'friend_find',
    'community_post_like',
    'community_post_comment'
  ));

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_find_id UUID DEFAULT NULL,
  p_community_post_id UUID DEFAULT NULL,
  p_community_comment_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    friendship_id,
    thread_id,
    post_id,
    find_id,
    community_post_id,
    community_comment_id
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_friendship_id,
    p_thread_id,
    p_post_id,
    p_find_id,
    p_community_post_id,
    p_community_comment_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_accepted_friends(
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_thread_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_find_id UUID DEFAULT NULL,
  p_community_post_id UUID DEFAULT NULL,
  p_community_comment_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  friend_record RECORD;
BEGIN
  FOR friend_record IN
    SELECT CASE
      WHEN f.requester_id = p_actor_id THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = p_actor_id OR f.addressee_id = p_actor_id)
  LOOP
    IF NOT public.is_friend_activity_muted(friend_record.friend_id, p_actor_id) THEN
      PERFORM public.create_notification(
        friend_record.friend_id,
        p_actor_id,
        p_type,
        p_title,
        p_body,
        NULL,
        p_thread_id,
        p_post_id,
        p_find_id,
        p_community_post_id,
        p_community_comment_id
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_community_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
  actor_name TEXT;
  preview TEXT;
BEGIN
  SELECT p.user_id, left(COALESCE(trim(p.body), 'your post'), 80)
  INTO post_owner, preview
  FROM public.community_posts p
  WHERE p.id = NEW.post_id;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_notification(
    post_owner,
    NEW.user_id,
    'community_post_like',
    'Reaction on your post',
    COALESCE(actor_name, 'Someone') || ' liked ' ||
      CASE WHEN preview IS NULL OR preview = '' THEN 'your post' ELSE '"' || preview || '"' END,
    NULL,
    NULL,
    NULL,
    NULL,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_community_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
  actor_name TEXT;
  preview TEXT;
  commenter_record RECORD;
BEGIN
  SELECT p.user_id, left(COALESCE(trim(p.body), ''), 80)
  INTO post_owner, preview
  FROM public.community_posts p
  WHERE p.id = NEW.post_id;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_notification(
    post_owner,
    NEW.user_id,
    'community_post_comment',
    'New comment on your post',
    COALESCE(actor_name, 'Someone') || ' commented on your post',
    NULL,
    NULL,
    NULL,
    NULL,
    NEW.post_id,
    NEW.id
  );

  FOR commenter_record IN
    SELECT DISTINCT c.user_id
    FROM public.community_post_comments c
    WHERE c.post_id = NEW.post_id
      AND c.user_id <> NEW.user_id
      AND c.user_id <> post_owner
      AND c.id <> NEW.id
  LOOP
    PERFORM public.create_notification(
      commenter_record.user_id,
      NEW.user_id,
      'community_post_comment',
      'New comment on a post you commented on',
      COALESCE(actor_name, 'Someone') || ' also commented on a post you joined',
      NULL,
      NULL,
      NULL,
      NULL,
      NEW.post_id,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_community_post_like_notification ON public.community_post_likes;
CREATE TRIGGER on_community_post_like_notification
  AFTER INSERT ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_post_like();

DROP TRIGGER IF EXISTS on_community_post_comment_notification ON public.community_post_comments;
CREATE TRIGGER on_community_post_comment_notification
  AFTER INSERT ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_community_post_comment();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view community posts" ON public.community_posts;
CREATE POLICY "Authenticated users view community posts"
  ON public.community_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users manage own community posts" ON public.community_posts;
CREATE POLICY "Users manage own community posts"
  ON public.community_posts FOR ALL
  USING (auth.uid() = user_id OR public.is_mod_or_admin())
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users view community media" ON public.community_post_media;
CREATE POLICY "Authenticated users view community media"
  ON public.community_post_media FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users manage own community media" ON public.community_post_media;
CREATE POLICY "Users manage own community media"
  ON public.community_post_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND (p.user_id = auth.uid() OR public.is_mod_or_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users view community likes" ON public.community_post_likes;
CREATE POLICY "Authenticated users view community likes"
  ON public.community_post_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can like community posts" ON public.community_post_likes;
CREATE POLICY "Users can like community posts"
  ON public.community_post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unlike community posts" ON public.community_post_likes;
CREATE POLICY "Users can unlike community posts"
  ON public.community_post_likes FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users view community comments" ON public.community_post_comments;
CREATE POLICY "Authenticated users view community comments"
  ON public.community_post_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can comment on community posts" ON public.community_post_comments;
CREATE POLICY "Users can comment on community posts"
  ON public.community_post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_posts p WHERE p.id = post_id
    )
  );

DROP POLICY IF EXISTS "Users delete own community comments" ON public.community_post_comments;
CREATE POLICY "Users delete own community comments"
  ON public.community_post_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_mod_or_admin());

-- ============================================================
-- STORAGE: community-media bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view community media storage" ON storage.objects;
CREATE POLICY "Anyone can view community media storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "Users upload own community media" ON storage.objects;
CREATE POLICY "Users upload own community media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community-media'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own community media storage" ON storage.objects;
CREATE POLICY "Users delete own community media storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Realtime (optional; safe if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
