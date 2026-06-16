-- Treasure Atlas | Migration 13 of 17: messenger-presence-default.sql
-- Prerequisites: messenger.sql (step 11)
-- Purpose: Default all users' presence to online
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.profiles
  ALTER COLUMN presence_status SET DEFAULT 'online';

UPDATE public.profiles
SET presence_status = 'online'
WHERE presence_status = 'offline';

COMMENT ON COLUMN public.profiles.presence_status IS
  'User chat status: online, busy, or offline. Defaults to online when using the app.';
