-- ═══════════════════════════════════════════════════════════════
-- HALLMATES MATCHING SYSTEM — Supabase Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create Roommate Profiles Table (if not exists)
CREATE TABLE IF NOT EXISTS roommate_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  habits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Swipes Table (if not exists)
CREATE TABLE IF NOT EXISTS roommate_swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES auth.users(id) NOT NULL,
  swiped_id UUID REFERENCES auth.users(id) NOT NULL,
  is_match BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- 3. Add updated_at column if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roommate_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 4. Create indexes for fast matching queries
CREATE INDEX IF NOT EXISTS idx_roommate_profiles_active ON roommate_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roommate_swipes_swiper ON roommate_swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_roommate_swipes_swiped ON roommate_swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_roommate_swipes_match ON roommate_swipes(swiper_id, swiped_id) WHERE is_match = true;

-- 5. Enable RLS
ALTER TABLE roommate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roommate_swipes ENABLE ROW LEVEL SECURITY;

-- 6. Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Anyone can read active profiles" ON roommate_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON roommate_profiles;
DROP POLICY IF EXISTS "Users can read their own swipes" ON roommate_swipes;
DROP POLICY IF EXISTS "Users can insert their own swipes" ON roommate_swipes;
DROP POLICY IF EXISTS "Users can delete their own swipes" ON roommate_swipes;

-- Profiles: Anyone authenticated can read active profiles
CREATE POLICY "Anyone can read active profiles"
ON roommate_profiles FOR SELECT
TO authenticated
USING (is_active = true);

-- Profiles: Users can insert/update their own profile
CREATE POLICY "Users can manage their own profile"
ON roommate_profiles FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Swipes: Users can read their own swipes (sent or received)
CREATE POLICY "Users can read their own swipes"
ON roommate_swipes FOR SELECT
TO authenticated
USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- Swipes: Users can insert their own swipes
CREATE POLICY "Users can insert their own swipes"
ON roommate_swipes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = swiper_id);

-- Swipes: Users can delete their own swipes (for rewind feature)
CREATE POLICY "Users can delete their own swipes"
ON roommate_swipes FOR DELETE
TO authenticated
USING (auth.uid() = swiper_id);

-- 7. Auto-update updated_at on roommate_profiles changes
CREATE OR REPLACE FUNCTION update_roommate_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roommate_profile_updated ON roommate_profiles;
CREATE TRIGGER trg_roommate_profile_updated
  BEFORE UPDATE ON roommate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_roommate_profile_timestamp();

-- 8. Match score function (server-side matching algorithm)
-- Compares two users' habits JSONB and returns a 0-100 compatibility score
CREATE OR REPLACE FUNCTION calculate_match_score(user_a UUID, user_b UUID)
RETURNS INTEGER AS $$
DECLARE
  habits_a JSONB;
  habits_b JSONB;
  keys TEXT[] := ARRAY['sleep', 'clean', 'social', 'music', 'study', 'weekend'];
  k TEXT;
  score INTEGER := 0;
  total INTEGER := 0;
BEGIN
  SELECT habits INTO habits_a FROM roommate_profiles WHERE id = user_a;
  SELECT habits INTO habits_b FROM roommate_profiles WHERE id = user_b;
  
  IF habits_a IS NULL OR habits_b IS NULL THEN RETURN 0; END IF;
  
  FOREACH k IN ARRAY keys LOOP
    IF habits_a ? k AND habits_b ? k THEN
      total := total + 1;
      IF habits_a ->> k = habits_b ->> k THEN
        score := score + 1;
      END IF;
    END IF;
  END LOOP;
  
  IF total = 0 THEN RETURN 0; END IF;
  RETURN ROUND((score::NUMERIC / total::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql STABLE;

-- Done! Your hallmates matching system is ready.
