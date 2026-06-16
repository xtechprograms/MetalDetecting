-- Treasure Atlas | Migration 19 of 19: messenger-replies.sql
-- Prerequisites: messenger.sql (step 11)
-- Purpose: Optional reply_to_id on direct messages (reply preview is encrypted in message content)
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to
  ON public.direct_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

COMMENT ON COLUMN public.direct_messages.reply_to_id IS
  'Optional reference to the message being replied to. Reply preview text is stored in encrypted message content.';
