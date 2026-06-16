-- Direct messaging between friends (run after schema.sql + notifications.sql)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_status TEXT NOT NULL DEFAULT 'offline'
    CHECK (presence_status IN ('online', 'busy', 'offline'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_one_id, user_two_id),
  CHECK (user_one_id < user_two_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_user_one
  ON public.direct_conversations(user_one_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_user_two
  ON public.direct_conversations(user_two_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_last_message
  ON public.direct_conversations(last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK (char_length(content) <= 4000),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(trim(content)) > 0 OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
  ON public.direct_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dm_read_state (
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE OR REPLACE FUNCTION public.are_accepted_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = p_user_a AND f.addressee_id = p_user_b)
        OR (f.requester_id = p_user_b AND f.addressee_id = p_user_a)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_one UUID;
  v_two UUID;
  v_conv_id UUID;
BEGIN
  IF v_user_id IS NULL OR p_other_user_id IS NULL OR v_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Invalid users';
  END IF;

  IF NOT public.are_accepted_friends(v_user_id, p_other_user_id) THEN
    RAISE EXCEPTION 'You can only message friends';
  END IF;

  IF v_user_id < p_other_user_id THEN
    v_one := v_user_id;
    v_two := p_other_user_id;
  ELSE
    v_one := p_other_user_id;
    v_two := v_user_id;
  END IF;

  SELECT id INTO v_conv_id
  FROM public.direct_conversations
  WHERE user_one_id = v_one AND user_two_id = v_two;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.direct_conversations (user_one_id, user_two_id)
    VALUES (v_one, v_two)
    RETURNING id INTO v_conv_id;

    INSERT INTO public.dm_read_state (conversation_id, user_id)
    VALUES (v_conv_id, v_one), (v_conv_id, v_two)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_dm_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_direct_message_touch_conversation ON public.direct_messages;
CREATE TRIGGER on_direct_message_touch_conversation
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_dm_conversation();

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own conversations" ON public.direct_conversations;
CREATE POLICY "Users view own conversations"
  ON public.direct_conversations FOR SELECT
  USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "Users view conversation messages" ON public.direct_messages;
CREATE POLICY "Users view conversation messages"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = conversation_id
        AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Friends send conversation messages" ON public.direct_messages;
CREATE POLICY "Friends send conversation messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE c.id = conversation_id
        AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
        AND public.are_accepted_friends(c.user_one_id, c.user_two_id)
    )
  );

DROP POLICY IF EXISTS "Users view own read state" ON public.dm_read_state;
CREATE POLICY "Users view own read state"
  ON public.dm_read_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own read state" ON public.dm_read_state;
CREATE POLICY "Users update own read state"
  ON public.dm_read_state FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own read state" ON public.dm_read_state;
CREATE POLICY "Users insert own read state"
  ON public.dm_read_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own presence" ON public.profiles;
CREATE POLICY "Users update own presence"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_accepted_friends(UUID, UUID) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view message images" ON storage.objects;
CREATE POLICY "Anyone can view message images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-images');

DROP POLICY IF EXISTS "Users upload own message images" ON storage.objects;
CREATE POLICY "Users upload own message images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-images'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own message images" ON storage.objects;
CREATE POLICY "Users delete own message images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
