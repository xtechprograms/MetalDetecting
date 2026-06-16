-- Treasure Atlas | Migration 7 of 17: avatars-storage.sql
-- Prerequisites: schema.sql (step 1)
-- Purpose: Profile avatar storage bucket and policies
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view find photos" ON storage.objects;
CREATE POLICY "Anyone can view find photos"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('find-photos', 'avatars'));

DROP POLICY IF EXISTS "Authenticated users can upload find photos" ON storage.objects;

CREATE POLICY "Users can upload own find photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'find-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  USING (
    auth.uid()::text = (storage.foldername(name))[1]
    AND bucket_id IN ('find-photos', 'avatars')
  );

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (
    auth.uid()::text = (storage.foldername(name))[1]
    AND bucket_id IN ('find-photos', 'avatars')
  );
