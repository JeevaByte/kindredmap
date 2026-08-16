ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_stage text,
  ADD COLUMN IF NOT EXISTS bio text;