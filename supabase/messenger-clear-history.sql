-- Treasure Atlas | Migration 16 of 17: messenger-clear-history.sql
-- Prerequisites: messenger.sql (step 11)
-- Purpose: RPC clear_dm_conversation — permanently delete a DM thread for both friends
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.
-- Tip: Close live site tabs if you see "deadlock detected", wait ~60s, retry.
-- Do NOT paste Supabase error messages into the editor.

CREATE OR REPLACE FUNCTION public.clear_dm_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.direct_conversations c
    WHERE c.id = p_conversation_id
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
      AND public.are_accepted_friends(c.user_one_id, c.user_two_id)
  ) THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  DELETE FROM public.direct_messages WHERE conversation_id = p_conversation_id;
  DELETE FROM public.dm_read_state WHERE conversation_id = p_conversation_id;
  DELETE FROM public.direct_conversations WHERE id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_dm_conversation(UUID) TO authenticated;

COMMENT ON FUNCTION public.clear_dm_conversation(UUID) IS
  'Permanently deletes all messages and the conversation between two friends. Both users see an empty history.';

-- Verify (optional):
-- SELECT proname FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND proname = 'clear_dm_conversation';
