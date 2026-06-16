-- Treasure Atlas | Migration 5 of 17: forum-reports.sql
-- Prerequisites: forum-schema.sql (step 2)
-- Purpose: Content reports and moderation queue
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

CREATE TABLE IF NOT EXISTS public.forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('thread', 'post')),
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'off_topic', 'inappropriate', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  moderator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT forum_reports_target CHECK (
    (report_type = 'thread' AND post_id IS NULL)
    OR (report_type = 'post' AND post_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON public.forum_reports(status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_thread ON public.forum_reports(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_created ON public.forum_reports(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_reports_pending_thread
  ON public.forum_reports (reporter_id, thread_id)
  WHERE status = 'pending' AND report_type = 'thread';

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_reports_pending_post
  ON public.forum_reports (reporter_id, post_id)
  WHERE status = 'pending' AND report_type = 'post' AND post_id IS NOT NULL;

ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and staff view reports" ON public.forum_reports;
CREATE POLICY "Users and staff view reports"
  ON public.forum_reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_mod_or_admin());

DROP POLICY IF EXISTS "Users create reports" ON public.forum_reports;
CREATE POLICY "Users create reports"
  ON public.forum_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() IS NOT NULL
    AND (
      (report_type = 'thread' AND EXISTS (
        SELECT 1 FROM public.forum_threads t
        WHERE t.id = thread_id
          AND NOT t.is_deleted
          AND t.user_id <> auth.uid()
      ))
      OR (report_type = 'post' AND EXISTS (
        SELECT 1 FROM public.forum_posts p
        JOIN public.forum_threads t ON t.id = p.thread_id
        WHERE p.id = post_id
          AND p.thread_id = forum_reports.thread_id
          AND NOT p.is_deleted
          AND NOT t.is_deleted
          AND p.user_id <> auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Staff update reports" ON public.forum_reports;
CREATE POLICY "Staff update reports"
  ON public.forum_reports FOR UPDATE
  USING (public.is_mod_or_admin())
  WITH CHECK (public.is_mod_or_admin());

-- Admins can revoke mod role (explicit RPC for audit-friendly revoke)
CREATE OR REPLACE FUNCTION public.admin_revoke_moderator(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke moderator permissions';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_role <> 'mod' THEN
    RAISE EXCEPTION 'User is not a moderator';
  END IF;

  UPDATE public.profiles SET role = 'user' WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_moderator TO authenticated;
