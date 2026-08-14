-- ═══════════════════════════════════════════════════════════════
-- HALL SWAP SYSTEM — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create Hall Swap Requests Table (with city/state)
CREATE TABLE IF NOT EXISTS hall_swap_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  current_hall_id UUID NOT NULL,
  desired_hall_id UUID NOT NULL,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add city/state columns if table already exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hall_swap_requests' AND column_name = 'city'
  ) THEN
    ALTER TABLE hall_swap_requests ADD COLUMN city TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hall_swap_requests' AND column_name = 'state'
  ) THEN
    ALTER TABLE hall_swap_requests ADD COLUMN state TEXT DEFAULT '';
  END IF;
END $$;

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_hall_swap_user ON hall_swap_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_hall_swap_current ON hall_swap_requests(current_hall_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hall_swap_desired ON hall_swap_requests(desired_hall_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hall_swap_active ON hall_swap_requests(is_active) WHERE is_active = true;

-- 3. Enable RLS
ALTER TABLE hall_swap_requests ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can read active swap requests" ON hall_swap_requests;
DROP POLICY IF EXISTS "Users can manage their own swap request" ON hall_swap_requests;
DROP POLICY IF EXISTS "Users can insert their own swap request" ON hall_swap_requests;
DROP POLICY IF EXISTS "Users can delete their own swap request" ON hall_swap_requests;

-- 5. RLS Policies
CREATE POLICY "Anyone can read active swap requests"
ON hall_swap_requests FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Users can insert their own swap request"
ON hall_swap_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own swap request"
ON hall_swap_requests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own swap request"
ON hall_swap_requests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Done! Your hall swap system is ready.
