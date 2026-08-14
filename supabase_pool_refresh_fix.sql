-- ═══════════════════════════════════════════════════════════
-- SAVIFY POOLS — Fix Duplicates & Restore Constraint
-- Run this in Supabase SQL Editor to clean up your dashboard
-- ═══════════════════════════════════════════════════════════

-- 1. DELETE DUPLICATE BLINKIT SLOTS FOR TODAY
-- We will keep only one slot per time-window per day for Blinkit.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY pool_type_id, slot_date, slot_start 
           ORDER BY created_at ASC
         ) as row_num
  FROM pool_slots
)
DELETE FROM pool_slots
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 2. RESTORE THE UNIQUE CONSTRAINT (This prevents the 6 slots from ever multiplying)
ALTER TABLE pool_slots ADD CONSTRAINT pool_slots_pool_type_id_slot_date_slot_start_key UNIQUE (pool_type_id, slot_date, slot_start);

-- 3. RECREATE THE GENERATION FUNCTION SAFELY WITH 'ON CONFLICT'
CREATE OR REPLACE FUNCTION generate_daily_pool_slots()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  -- Time slots only for 'timeslot' mode pools (Blinkit)
  -- Uses ON CONFLICT to guarantee absolutely no duplicates
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

  -- One "All Day" slot for headcount pools (Netflix, Spotify)
  -- ONLY create a new one if there isn't a 'running' slot already!
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  SELECT pt.id, CURRENT_DATE, 'All Day', '', 'running'
  FROM pool_types pt
  WHERE pt.pool_mode = 'headcount'
  AND NOT EXISTS (
    SELECT 1 FROM pool_slots ps 
    WHERE ps.pool_type_id = pt.id 
      AND ps.status = 'running'
  )
  ON CONFLICT ON CONSTRAINT pool_slots_pool_type_id_slot_date_slot_start_key DO NOTHING;

END;
$$ LANGUAGE plpgsql;
