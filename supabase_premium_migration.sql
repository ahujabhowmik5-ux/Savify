-- ===========================================
-- Supabase SQL: Premium Feature Support
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add is_premium column (skip if already exists from previous migration)
ALTER TABLE public.user_applications
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 2. Add premium_purchased_at timestamp
ALTER TABLE public.user_applications
ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Index for quick premium lookups
CREATE INDEX IF NOT EXISTS idx_user_applications_is_premium
ON public.user_applications(is_premium);

-- 4. Allow the service role to update is_premium via webhook
-- (The existing RLS policies should already allow service_role full access.
--  If not, add the policy below.)

-- Optional: RLS policy so users can read their own premium status
CREATE POLICY "Users can read own premium status"
ON public.user_applications
FOR SELECT
USING (auth.uid()::text = user_id);

-- 5. Verify: Check the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_applications'
  AND column_name IN ('is_premium', 'premium_purchased_at');
