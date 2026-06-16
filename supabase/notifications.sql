-- Treasure Atlas | Migration 9 of 17: notifications.sql
-- Prerequisites: schema.sql, forum-schema.sql, gallery-and-likes.sql (steps 1–3)
-- Purpose: Notifications table, triggers, Realtime publication
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.
-- Tip: Close live site tabs if you see "deadlock detected" (Realtime holds locks).

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'forum_thread_reply',
    'forum_post_reply',
    'forum_thread_like',
    'forum_post_like'
  )),
  friendship_id UUID REFERENCES public.friendships(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_post_id UUID DEFAULT NULL
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
    post_id
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    p_friendship_id,
    p_thread_id,
    p_post_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.requester_id;

  PERFORM public.create_notification(
    NEW.addressee_id,
    NEW.requester_id,
    'friend_request',
    'New friend request',
    COALESCE(actor_name, 'Someone') || ' sent you a friend request',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.addressee_id;

    PERFORM public.create_notification(
      NEW.requester_id,
      NEW.addressee_id,
      'friend_accepted',
      'Friend request accepted',
      COALESCE(actor_name, 'Someone') || ' accepted your friend request',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_owner UUID;
  thread_title TEXT;
  actor_name TEXT;
  participant RECORD;
BEGIN
  SELECT t.user_id, t.title
  INTO thread_owner, thread_title
  FROM public.forum_threads t
  WHERE t.id = NEW.thread_id;

  IF thread_owner IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;
  actor_name := COALESCE(actor_name, 'Someone');
  thread_title := COALESCE(left(thread_title, 80), 'a thread');

  IF thread_owner <> NEW.user_id THEN
    PERFORM public.create_notification(
      thread_owner,
      NEW.user_id,
      'forum_thread_reply',
      'New reply on your thread',
      actor_name || ' replied in "' || thread_title || '"',
      NULL,
      NEW.thread_id,
      NEW.id
    );
  END IF;

  FOR participant IN
    SELECT DISTINCT fp.user_id
    FROM public.forum_posts fp
    WHERE fp.thread_id = NEW.thread_id
      AND fp.id <> NEW.id
      AND fp.user_id <> NEW.user_id
      AND fp.user_id <> thread_owner
  LOOP
    PERFORM public.create_notification(
      participant.user_id,
      NEW.user_id,
      'forum_post_reply',
      'New reply in a thread you posted in',
      actor_name || ' replied in "' || thread_title || '"',
      NULL,
      NEW.thread_id,
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_thread_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_owner UUID;
  thread_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT t.user_id, t.title
  INTO thread_owner, thread_title
  FROM public.forum_threads t
  WHERE t.id = NEW.thread_id;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_notification(
    thread_owner,
    NEW.user_id,
    'forum_thread_like',
    'Reaction on your forum thread',
    COALESCE(actor_name, 'Someone') || ' liked "' || COALESCE(left(thread_title, 80), 'your thread') || '"',
    NULL,
    NEW.thread_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_forum_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
  post_thread_id UUID;
  thread_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT p.user_id, p.thread_id
  INTO post_owner, post_thread_id
  FROM public.forum_posts p
  WHERE p.id = NEW.post_id;

  SELECT title INTO thread_title
  FROM public.forum_threads
  WHERE id = post_thread_id;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_notification(
    post_owner,
    NEW.user_id,
    'forum_post_like',
    'Reaction on your forum reply',
    COALESCE(actor_name, 'Someone') || ' liked your reply in "' || COALESCE(left(thread_title, 80), 'a thread') || '"',
    NULL,
    post_thread_id,
    NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request_notification ON public.friendships;
CREATE TRIGGER on_friend_request_notification
  AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

DROP TRIGGER IF EXISTS on_friend_accepted_notification ON public.friendships;
CREATE TRIGGER on_friend_accepted_notification
  AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friend_accepted();

DROP TRIGGER IF EXISTS on_forum_reply_notification ON public.forum_posts;
CREATE TRIGGER on_forum_reply_notification
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_reply();

DROP TRIGGER IF EXISTS on_forum_thread_like_notification ON public.forum_thread_likes;
CREATE TRIGGER on_forum_thread_like_notification
  AFTER INSERT ON public.forum_thread_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_thread_like();

DROP TRIGGER IF EXISTS on_forum_post_like_notification ON public.forum_post_likes;
CREATE TRIGGER on_forum_post_like_notification
  AFTER INSERT ON public.forum_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_forum_post_like();

-- Realtime (optional; safe if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
