-- Treasure Atlas | Migration 8 of 17: find-anonymity.sql
-- Prerequisites: schema.sql (step 1)
-- Purpose: Anonymous find posting and map visibility toggles
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.finds
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT true;

-- Existing public finds: keep anonymous by default for privacy
UPDATE public.finds SET is_anonymous = true WHERE is_anonymous IS NULL;
