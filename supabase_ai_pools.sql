-- ═══════════════════════════════════════════════════════════
-- SAVIFY AI POOLS UPDATE SCRIPT
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Remove Cab pools (as requested by user)
DELETE FROM pool_types WHERE name IN ('Cab Pool – 5 Seater', 'Cab Pool – 7 Seater');

-- 2. Insert new AI pool types (if they don't exist)
INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members) VALUES
  ('ChatGPT Plus', '🤖', 'ChatGPT Plus Subscription', 4, 'headcount', 3),
  ('ChatGPT Pro', '🤖', 'ChatGPT Pro Subscription', 4, 'headcount', 3),
  ('ChatGPT Team', '👥', 'ChatGPT Team Subscription', 4, 'headcount', 3),
  ('Claude Pro', '🧠', 'Claude Pro Subscription', 4, 'headcount', 3),
  ('Claude Max', '🔥', 'Claude Max Subscription', 4, 'headcount', 3),
  ('Claude Team', '👥', 'Claude Team Subscription', 4, 'headcount', 3),
  ('Gemini Advanced', '✨', 'Gemini Advanced Subscription', 4, 'headcount', 3),
  ('Gemini Business', '💼', 'Gemini Business Subscription', 4, 'headcount', 3),
  ('Gemini Enterprise', '🏢', 'Gemini Enterprise Subscription', 4, 'headcount', 3)
ON CONFLICT (name) DO NOTHING;

-- 3. Create today's slots for the new AI headcount pools
INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, 'All Day', ''
FROM pool_types pt
WHERE pt.pool_mode = 'headcount' AND pt.name IN (
  'ChatGPT Plus', 'ChatGPT Pro', 'ChatGPT Team',
  'Claude Pro', 'Claude Max', 'Claude Team',
  'Gemini Advanced', 'Gemini Business', 'Gemini Enterprise'
)
ON CONFLICT DO NOTHING;
