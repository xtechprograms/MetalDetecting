-- Default presence to online (run after messenger.sql)

ALTER TABLE public.profiles
  ALTER COLUMN presence_status SET DEFAULT 'online';

UPDATE public.profiles
SET presence_status = 'online'
WHERE presence_status = 'offline';

COMMENT ON COLUMN public.profiles.presence_status IS
  'User chat status: online, busy, or offline. Defaults to online when using the app.';
