-- ═══════════════════════════════════════════════════════════
-- SAVIFY POOLS — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Pool Types (fixed services — seed once, never changes)
CREATE TABLE pool_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '📦',
  description TEXT DEFAULT '',
  slot_duration_hours INT DEFAULT 4,
  pool_mode TEXT DEFAULT 'timeslot',   -- 'timeslot' or 'headcount'
  max_members INT,                      -- NULL = unlimited, 4 = Netflix, 6 = Spotify, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pool Slots (auto-created daily, 4-hour windows for timeslot pools, 1 daily slot for headcount pools)
CREATE TABLE pool_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type_id UUID REFERENCES pool_types(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slot_start TEXT NOT NULL,
  slot_end TEXT NOT NULL,
  status TEXT DEFAULT 'running', -- 'running', 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pool_type_id, slot_date, slot_start)
);

-- 3. Pool Members (users who join a slot)
CREATE TABLE pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_slot_id UUID REFERENCES pool_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT 'Anonymous',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pool_slot_id, user_id)
);

-- ═══════════════════════════════════════════════════════════
-- SEED: Insert the fixed pool types
-- ═══════════════════════════════════════════════════════════

INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members) VALUES
  ('Blinkit Pool',         '🛒', 'Group grocery orders for free delivery',  4, 'timeslot',  NULL),
  ('Cab Pool – 5 Seater',  '🚕', 'Share rides and split fare (5 seats)',    4, 'headcount', 5),
  ('Cab Pool – 7 Seater',  '🚕', 'Share rides and split fare (7 seats)',    4, 'headcount', 7),
  ('Spotify Pool',         '🎵', 'Split Spotify Family Plan',               4, 'headcount', 6),
  ('Netflix Pool',         '🎬', 'Split Netflix Family Plan',               4, 'headcount', 4);

-- ═══════════════════════════════════════════════════════════
-- SEED: Create today's time slots for ALL pool types
-- (6 slots per timeslot pool, 1 daily slot per headcount pool)
-- ═══════════════════════════════════════════════════════════

INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, s.slot_start, s.slot_end
FROM pool_types pt
CROSS JOIN (VALUES
  ('12:00 AM', '4:00 AM'),
  ('4:00 AM',  '8:00 AM'),
  ('8:00 AM',  '12:00 PM'),
  ('12:00 PM', '4:00 PM'),
  ('4:00 PM',  '8:00 PM'),
  ('8:00 PM',  '12:00 AM')
) AS s(slot_start, slot_end)
WHERE pt.pool_mode = 'timeslot'
ON CONFLICT DO NOTHING;

INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, 'All Day', ''
FROM pool_types pt
WHERE pt.pool_mode = 'headcount'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ═══════════════════════════════════════════════════════════

ALTER TABLE pool_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;

-- Everyone can read pool types and slots
CREATE POLICY "Anyone can read pool_types" ON pool_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read pool_slots" ON pool_slots FOR SELECT USING (true);
CREATE POLICY "Anyone can read pool_members" ON pool_members FOR SELECT USING (true);

-- Authenticated users can join pools
CREATE POLICY "Auth users can join pools" ON pool_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only remove themselves
CREATE POLICY "Users can leave pools" ON pool_members FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- REALTIME: Enable realtime on pool_members
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE pool_members;

-- ═══════════════════════════════════════════════════════════
-- AUTO-GENERATION: Function to generate daily slots
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_daily_pool_slots()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- Time slots only for 'timeslot' mode pools (Blinkit)
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
  SELECT pt.id, CURRENT_DATE, s.slot_start, s.slot_end
  FROM pool_types pt
  CROSS JOIN (VALUES
    ('12:00 AM', '4:00 AM'),
    ('4:00 AM',  '8:00 AM'),
    ('8:00 AM',  '12:00 PM'),
    ('12:00 PM', '4:00 PM'),
    ('4:00 PM',  '8:00 PM'),
    ('8:00 PM',  '12:00 AM')
  ) AS s(slot_start, slot_end)
  WHERE pt.pool_mode = 'timeslot'
  ON CONFLICT DO NOTHING;

  -- One "All Day" slot for headcount pools (Netflix, Spotify, Cab variants)
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
  SELECT pt.id, CURRENT_DATE, 'All Day', ''
  FROM pool_types pt
  WHERE pt.pool_mode = 'headcount'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
