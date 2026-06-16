-- Treasure Atlas | Migration 17 of 17: notifications-clear-history.sql
-- Prerequisites: notifications.sql (step 9)
-- Purpose: RPC clear_notification_history — permanently delete all notifications for the current user
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.
-- Tip: Close live site tabs if you see "deadlock detected", wait ~60s, retry.
-- Do NOT paste Supabase error messages into the editor.
--
-- Uses SECURITY DEFINER RPC (not a DELETE RLS policy) to avoid lock contention with Realtime.

CREATE OR REPLACE FUNCTION public.clear_notification_history()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.notifications WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_notification_history() TO authenticated;

COMMENT ON FUNCTION public.clear_notification_history() IS
  'Permanently deletes all notifications for the current user.';

-- Verify (optional):
-- SELECT proname FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND proname = 'clear_notification_history';
