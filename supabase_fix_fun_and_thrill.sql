-- ══════════════════════════════════════════════════════════════
-- SAVIFY: Comprehensive Fix for Fun & Thrill Subscription Pools
-- Run this in Supabase SQL Editor to fix the black screen issue
-- ══════════════════════════════════════════════════════════════

-- ─── STEP 1: Ensure all subscription pool types exist (UPSERT) ───
-- This guarantees the pool types are present regardless of
-- whether supabase_subscription_pools.sql was previously run.

INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
-- Netflix
('Netflix Standard', 'Great video quality in 1080p. Watch on 2 supported devices at a time.', '🍿', 'headcount', 2),
('Netflix Premium', 'Best video quality in 4K+HDR. Watch on 4 supported devices at a time.', '🍿', 'headcount', 4),
-- Spotify
('Spotify Premium Duo', '2 Premium accounts for a couple under one roof.', '🎵', 'headcount', 2),
('Spotify Premium Family', 'Up to 6 Premium accounts for family members living together.', '🎵', 'headcount', 6),
('Spotify Premium Student', 'Special discount for eligible students in university.', '🎵', 'headcount', 2),
('Spotify Premium Platinum', 'The ultimate Spotify experience with HiFi and AI tools.', '🎵', 'headcount', 3),
-- Prime Video
('Prime Video Monthly', 'Enjoy Amazon Prime benefits for one month.', '📦', 'headcount', 5),
('Prime Video Quarterly', '3 months of Amazon Prime benefits.', '📦', 'headcount', 5),
('Prime Video Annual', 'Best value! 12 months of Amazon Prime benefits.', '📦', 'headcount', 5),
-- Jio Hotstar
('Jio Hotstar Super', 'Watch on TV or Mobile, in 1080p Full HD resolution.', '🏏', 'headcount', 2),
('Jio Hotstar Premium', 'Watch on TV or Mobile, in 4K resolution with 4 devices.', '🏏', 'headcount', 4)
ON CONFLICT (name) DO UPDATE 
SET 
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    pool_mode = EXCLUDED.pool_mode,
    max_members = EXCLUDED.max_members;

-- ─── STEP 2: Ensure the unique constraint exists on pool_slots ───
-- The generate function relies on this constraint for ON CONFLICT.
-- DO NOTHING if it already exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pool_slots_pool_type_id_slot_date_slot_start_key'
    ) THEN
        ALTER TABLE pool_slots 
        ADD CONSTRAINT pool_slots_pool_type_id_slot_date_slot_start_key 
        UNIQUE (pool_type_id, slot_date, slot_start);
    END IF;
END $$;

-- ─── STEP 3: Recreate generate_daily_pool_slots with fixes ───
-- BUG FIX: The old function had `NOT EXISTS (... WHERE status = 'running')`
-- which prevented new slots from being created if an OLD running slot 
-- existed from a previous day. Fixed to check the CURRENT DATE.

CREATE OR REPLACE FUNCTION generate_daily_pool_slots()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- Time slots for 'timeslot' mode pools (Blinkit, etc.)
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  SELECT pt.id, CURRENT_DATE, s.slot_start, s.slot_end, 'running'
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
  ON CONFLICT ON CONSTRAINT pool_slots_pool_type_id_slot_date_slot_start_key DO NOTHING;

  -- One "All Day" slot for headcount pools (Netflix, Spotify, Cab, etc.)
  -- FIX: Only check for running slots on TODAY's date, not across all dates.
  -- This ensures new daily slots are always created.
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  SELECT pt.id, CURRENT_DATE, 'All Day', '', 'running'
  FROM pool_types pt
  WHERE pt.pool_mode = 'headcount'
  AND NOT EXISTS (
    SELECT 1 FROM pool_slots ps 
    WHERE ps.pool_type_id = pt.id 
      AND ps.slot_date = CURRENT_DATE
      AND ps.slot_start = 'All Day'
  )
  ON CONFLICT ON CONSTRAINT pool_slots_pool_type_id_slot_date_slot_start_key DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ─── STEP 4: Generate today's slots immediately ───
-- This creates the missing slots for all subscription pool types.
SELECT generate_daily_pool_slots();

-- ─── STEP 5: Verify everything worked ───
-- Run this SELECT to confirm subscription pools have slots:
-- SELECT pt.name, ps.slot_date, ps.slot_start, ps.status
-- FROM pool_types pt
-- LEFT JOIN pool_slots ps ON ps.pool_type_id = pt.id AND ps.slot_date = CURRENT_DATE
-- WHERE pt.pool_mode = 'headcount'
-- ORDER BY pt.name;
