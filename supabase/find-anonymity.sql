-- Anonymous find posting (run in Supabase SQL Editor)

ALTER TABLE public.finds
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT true;

-- Existing public finds: keep anonymous by default for privacy
UPDATE public.finds SET is_anonymous = true WHERE is_anonymous IS NULL;
