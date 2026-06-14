-- Profile gallery, gallery likes/comments, and forum likes
-- Run in Supabase SQL Editor after forum-schema.sql

-- ============================================================
-- GALLERY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_user ON public.profile_gallery_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_created ON public.profile_gallery_photos(created_at DESC);

CREATE TABLE IF NOT EXISTS public.gallery_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.profile_gallery_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_likes_photo ON public.gallery_likes(photo_id);

CREATE TABLE IF NOT EXISTS public.gallery_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.profile_gallery_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_comments_photo ON public.gallery_comments(photo_id);

-- ============================================================
-- FORUM LIKES
-- ============================================================

ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.forum_thread_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.forum_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_thread_likes_thread ON public.forum_thread_likes(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post ON public.forum_post_likes(post_id);

-- ============================================================
-- COUNT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_gallery_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_gallery_photos SET like_count = like_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_gallery_photos SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.photo_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_gallery_like_count ON public.gallery_likes;
CREATE TRIGGER on_gallery_like_count
  AFTER INSERT OR DELETE ON public.gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_gallery_like_count();

CREATE OR REPLACE FUNCTION public.sync_gallery_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_gallery_photos SET comment_count = comment_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_gallery_photos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.photo_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_gallery_comment_count ON public.gallery_comments;
CREATE TRIGGER on_gallery_comment_count
  AFTER INSERT OR DELETE ON public.gallery_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_gallery_comment_count();

CREATE OR REPLACE FUNCTION public.sync_forum_thread_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_forum_thread_like_count ON public.forum_thread_likes;
CREATE TRIGGER on_forum_thread_like_count
  AFTER INSERT OR DELETE ON public.forum_thread_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_thread_like_count();

CREATE OR REPLACE FUNCTION public.sync_forum_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_forum_post_like_count ON public.forum_post_likes;
CREATE TRIGGER on_forum_post_like_count
  AFTER INSERT OR DELETE ON public.forum_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_forum_post_like_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profile_gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;

-- Gallery photos
DROP POLICY IF EXISTS "Anyone can view gallery photos" ON public.profile_gallery_photos;
CREATE POLICY "Anyone can view gallery photos"
  ON public.profile_gallery_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own gallery photos" ON public.profile_gallery_photos;
CREATE POLICY "Users manage own gallery photos"
  ON public.profile_gallery_photos FOR ALL
  USING (auth.uid() = user_id OR public.is_mod_or_admin())
  WITH CHECK (auth.uid() = user_id);

-- Gallery likes
DROP POLICY IF EXISTS "Anyone can view gallery likes" ON public.gallery_likes;
CREATE POLICY "Anyone can view gallery likes"
  ON public.gallery_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like gallery photos" ON public.gallery_likes;
CREATE POLICY "Users can like gallery photos"
  ON public.gallery_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profile_gallery_photos p
      WHERE p.id = photo_id AND p.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unlike gallery photos" ON public.gallery_likes;
CREATE POLICY "Users can unlike gallery photos"
  ON public.gallery_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Gallery comments
DROP POLICY IF EXISTS "Anyone can view gallery comments" ON public.gallery_comments;
CREATE POLICY "Anyone can view gallery comments"
  ON public.gallery_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can comment on gallery photos" ON public.gallery_comments;
CREATE POLICY "Users can comment on gallery photos"
  ON public.gallery_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profile_gallery_photos p WHERE p.id = photo_id
    )
  );

DROP POLICY IF EXISTS "Users delete own gallery comments" ON public.gallery_comments;
CREATE POLICY "Users delete own gallery comments"
  ON public.gallery_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_mod_or_admin());

DROP POLICY IF EXISTS "Users update own gallery comments" ON public.gallery_comments;
CREATE POLICY "Users update own gallery comments"
  ON public.gallery_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Forum thread likes
DROP POLICY IF EXISTS "Anyone can view thread likes" ON public.forum_thread_likes;
CREATE POLICY "Anyone can view thread likes"
  ON public.forum_thread_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like threads" ON public.forum_thread_likes;
CREATE POLICY "Users can like threads"
  ON public.forum_thread_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND NOT t.is_deleted AND t.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unlike threads" ON public.forum_thread_likes;
CREATE POLICY "Users can unlike threads"
  ON public.forum_thread_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Forum post likes
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.forum_post_likes;
CREATE POLICY "Anyone can view post likes"
  ON public.forum_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like forum posts" ON public.forum_post_likes;
CREATE POLICY "Users can like forum posts"
  ON public.forum_post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_posts p
      JOIN public.forum_threads t ON t.id = p.thread_id
      WHERE p.id = post_id AND NOT p.is_deleted AND NOT t.is_deleted AND p.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can unlike forum posts" ON public.forum_post_likes;
CREATE POLICY "Users can unlike forum posts"
  ON public.forum_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE: gallery-photos bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view gallery storage" ON storage.objects;
CREATE POLICY "Anyone can view gallery storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-photos');

DROP POLICY IF EXISTS "Users upload own gallery photos" ON storage.objects;
CREATE POLICY "Users upload own gallery photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own gallery storage" ON storage.objects;
CREATE POLICY "Users delete own gallery storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gallery-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
