-- Treasure Atlas | Migration 10 of 17: friend-activity-notifications.sql
-- Prerequisites: notifications.sql (step 9)
-- Purpose: Friend activity alerts and per-friend notification mute
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS find_id UUID REFERENCES public.finds(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'forum_thread_reply',
    'forum_post_reply',
    'forum_thread_like',
    'forum_post_like',
    'friend_forum_thread',
    'friend_forum_post',
    'friend_find'
  ));

CREATE TABLE IF NOT EXISTS public.friend_notification_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, muted_user_id),
  CHECK (user_id <> muted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_notification_mutes_user
  ON public.friend_notification_mutes(user_id);

ALTER TABLE public.friend_notification_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own friend mutes" ON public.friend_notification_mutes;
CREATE POLICY "Users view own friend mutes"
  ON public.friend_notification_mutes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mute friends" ON public.friend_notification_mutes;
CREATE POLICY "Users mute friends"
  ON public.friend_notification_mutes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users unmute friends" ON public.friend_notification_mutes;
CREATE POLICY "Users unmute friends"
  ON public.friend_notification_mutes FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_friend_activity_muted(
  p_recipient UUID,
  p_actor UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_notification_mutes
    WHERE user_id = p_recipient
      AND muted_user_id = p_actor
  );
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_find_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    friendship_id,
    thread_id,
    post_id,
    find_id
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_friendship_id,
    p_thread_id,
    p_post_id,
    p_find_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_accepted_friends(
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_thread_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_find_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  friend_record RECORD;
BEGIN
  FOR friend_record IN
    SELECT CASE
      WHEN f.requester_id = p_actor_id THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = p_actor_id OR f.addressee_id = p_actor_id)
  LOOP
    IF NOT public.is_friend_activity_muted(friend_record.friend_id, p_actor_id) THEN
      PERFORM public.create_notification(
        friend_record.friend_id,
        p_actor_id,
        p_type,
        p_title,
        p_body,
        NULL,
        p_thread_id,
        p_post_id,
        p_find_id
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_forum_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.notify_accepted_friends(
    NEW.user_id,
    'friend_forum_thread',
    'Friend posted on the forum',
    COALESCE(actor_name, 'A friend') || ' started "' || COALESCE(left(NEW.title, 80), 'a new thread') || '"',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_forum_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
  thread_title TEXT;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO thread_title FROM public.forum_threads WHERE id = NEW.thread_id;

  PERFORM public.notify_accepted_friends(
    NEW.user_id,
    'friend_forum_post',
    'Friend replied on the forum',
    COALESCE(actor_name, 'A friend') || ' posted in "' || COALESCE(left(thread_title, 80), 'a thread') || '"',
    NEW.thread_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_find()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.notify_accepted_friends(
    NEW.user_id,
    'friend_find',
    'Friend logged a find',
    COALESCE(actor_name, 'A friend') || ' logged "' || COALESCE(left(NEW.title, 80), 'a new find') || '"',
    NULL,
    NULL,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_forum_thread_notification ON public.forum_threads;
CREATE TRIGGER on_friend_forum_thread_notification
  AFTER INSERT ON public.forum_threads
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_forum_thread();

DROP TRIGGER IF EXISTS on_friend_forum_post_notification ON public.forum_posts;
CREATE TRIGGER on_friend_forum_post_notification
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_forum_post();

DROP TRIGGER IF EXISTS on_friend_find_notification ON public.finds;
CREATE TRIGGER on_friend_find_notification
  AFTER INSERT ON public.finds
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_find();
