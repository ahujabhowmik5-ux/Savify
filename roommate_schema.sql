-- Create Roommate Profiles Table
CREATE TABLE IF NOT EXISTS roommate_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  habits JSONB, -- Stores questionnaire answers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Swipes Table
CREATE TABLE IF NOT EXISTS roommate_swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES auth.users(id),
  swiped_id UUID REFERENCES auth.users(id),
  is_match BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- RLS Policies
ALTER TABLE roommate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roommate_swipes ENABLE ROW LEVEL SECURITY;

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

-- Swipes: Users can read their own swipes
CREATE POLICY "Users can read their own swipes"
ON roommate_swipes FOR SELECT
TO authenticated
USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- Swipes: Users can insert their own swipes
CREATE POLICY "Users can insert their own swipes"
ON roommate_swipes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = swiper_id);
