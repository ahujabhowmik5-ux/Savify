-- ═══════════════════════════════════════════════════════════
-- SAVIFY CATEGORIES SYNC SCRIPT
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Insert remaining Headcount Pools
INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members)
VALUES 
  ('Amazon Prime Pool', '🎬', 'Split Amazon Prime subscription', 4, 'headcount', 4),
  ('JioHotstar Pool', '📺', 'Split JioHotstar Premium', 4, 'headcount', 4),
  ('Jio Family Pool', '📱', 'Split Jio Postpaid Family Plan', 4, 'headcount', 4),
  ('Airtel Family Pool', '📡', 'Split Airtel Postpaid Family Plan', 4, 'headcount', 4),
  ('Udemy Course Pool', '🎓', 'Split a premium Udemy course', 4, 'headcount', 4),
  ('Coursera Plus Pool', '📚', 'Split Coursera Plus subscription', 4, 'headcount', 4),
  ('LinkedIn Premium Pool', '💼', 'Split LinkedIn Premium subscription', 4, 'headcount', 4),
  ('YouTube Premium Pool', '▶️', 'Split YouTube Premium Family Plan', 4, 'headcount', 6)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert remaining Timeslot Pools
INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members)
VALUES 
  ('Swiggy Food Pool', '🍔', 'Order food together and save on delivery', 4, 'timeslot', NULL),
  ('Zomato Pool', '🍕', 'Group food ordering for discounts', 4, 'timeslot', NULL)
ON CONFLICT (name) DO NOTHING;

-- 3. Generate "All Day" slots for all Headcount Pools (for today)
INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, 'All Day', ''
FROM pool_types pt
WHERE pt.pool_mode = 'headcount'
  AND pt.name IN (
    'Amazon Prime Pool', 'JioHotstar Pool', 'Jio Family Pool', 'Airtel Family Pool', 
    'Udemy Course Pool', 'Coursera Plus Pool', 'LinkedIn Premium Pool', 'YouTube Premium Pool'
  )
ON CONFLICT DO NOTHING;

-- 4. Generate Timeslots for new Timeslot Pools (for today)
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
  AND pt.name IN ('Swiggy Food Pool', 'Zomato Pool')
ON CONFLICT DO NOTHING;
