-- Migration to support premium accounts
ALTER TABLE public.user_applications
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Optionally, you can add an index if you plan to fetch all premium users frequently
CREATE INDEX IF NOT EXISTS idx_user_applications_is_premium ON public.user_applications(is_premium);
