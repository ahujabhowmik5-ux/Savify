-- 1. Add missing Quick Commerce pools to pool_types
INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members)
VALUES 
  ('Zepto Pool', '⚡', '10-min grocery delivery shared cart', 4, 'timeslot', NULL),
  ('Swiggy Instamart Pool', '🛒', 'Instant grocery delivery shared cart', 4, 'timeslot', NULL),
  ('Amazon Now Pool', '📦', 'Fast delivery shared cart', 4, 'timeslot', NULL)
ON CONFLICT (name) DO NOTHING;

-- 2. Generate slots for them for today
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
  AND pt.name IN ('Zepto Pool', 'Swiggy Instamart Pool', 'Amazon Now Pool')
ON CONFLICT DO NOTHING;

-- 3. Alter group_carts to support different pool names
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS pool_name TEXT DEFAULT 'Blinkit Pool';
