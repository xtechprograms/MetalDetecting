-- Treasure Atlas | Migration 14 of 17: messenger-friends-realtime.sql
-- Prerequisites: messenger.sql (step 11)
-- Purpose: Realtime on friendships table (live messenger friends list)
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
