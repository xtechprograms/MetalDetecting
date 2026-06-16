-- Treasure Atlas | Migration 4 of 17: forum-images.sql
-- Prerequisites: forum-schema.sql (step 2)
-- Purpose: Forum post/thread image storage
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-images', 'forum-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view forum images" ON storage.objects;
CREATE POLICY "Anyone can view forum images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-images');

DROP POLICY IF EXISTS "Users upload own forum images" ON storage.objects;
CREATE POLICY "Users upload own forum images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forum-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own forum images" ON storage.objects;
CREATE POLICY "Users delete own forum images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'forum-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
