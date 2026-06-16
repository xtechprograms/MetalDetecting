-- Realtime friend list updates for messenger (run after messenger.sql)

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
