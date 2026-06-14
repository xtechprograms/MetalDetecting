-- Forum bans & suspensions (run in Supabase SQL Editor after forum-schema.sql)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forum_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forum_suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forum_moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS forum_moderated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS forum_moderated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_forum_posting_allowed(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN check_user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = check_user_id AND p.forum_banned = true
    ) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = check_user_id
        AND p.forum_suspended_until IS NOT NULL
        AND p.forum_suspended_until > NOW()
    ) THEN false
    ELSE true
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_forum_posting_allowed TO authenticated;

-- Block banned/suspended users from creating threads or replies
DROP POLICY IF EXISTS "Authenticated users create threads" ON public.forum_threads;
CREATE POLICY "Authenticated users create threads"
  ON public.forum_threads FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND public.is_forum_posting_allowed()
  );

DROP POLICY IF EXISTS "Authenticated users create posts" ON public.forum_posts;
CREATE POLICY "Authenticated users create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND public.is_forum_posting_allowed()
    AND EXISTS (
      SELECT 1 FROM public.forum_threads t
      WHERE t.id = thread_id AND NOT t.is_locked AND NOT t.is_deleted
    )
  );

CREATE OR REPLACE FUNCTION public.admin_ban_forum_user(
  target_user_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can ban forum users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot ban yourself';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot ban an administrator';
  END IF;

  UPDATE public.profiles
  SET
    forum_banned = true,
    forum_suspended_until = NULL,
    forum_moderation_reason = NULLIF(TRIM(reason), ''),
    forum_moderated_by = auth.uid(),
    forum_moderated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suspend_forum_user(
  target_user_id UUID,
  duration_hours INTEGER DEFAULT NULL,
  duration_days INTEGER DEFAULT NULL,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role TEXT;
  suspend_until TIMESTAMPTZ;
  total_hours INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can suspend forum users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend yourself';
  END IF;

  IF duration_hours IS NULL AND duration_days IS NULL THEN
    RAISE EXCEPTION 'Specify duration_hours or duration_days';
  END IF;

  total_hours := COALESCE(duration_hours, 0) + COALESCE(duration_days, 0) * 24;

  IF total_hours <= 0 THEN
    RAISE EXCEPTION 'Suspension duration must be greater than zero';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot suspend an administrator';
  END IF;

  suspend_until := NOW() + (total_hours * INTERVAL '1 hour');

  UPDATE public.profiles
  SET
    forum_banned = false,
    forum_suspended_until = suspend_until,
    forum_moderation_reason = NULLIF(TRIM(reason), ''),
    forum_moderated_by = auth.uid(),
    forum_moderated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lift_forum_restriction(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can lift forum restrictions';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles
  SET
    forum_banned = false,
    forum_suspended_until = NULL,
    forum_moderation_reason = NULL,
    forum_moderated_by = NULL,
    forum_moderated_at = NULL
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_forum_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_forum_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lift_forum_restriction TO authenticated;
