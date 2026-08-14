-- ═══════════════════════════════════════════════════════════
-- SAVIFY GLOBAL ACTIVITIES SCRIPT
-- Run this in Supabase SQL Editor to make Activity Feed Global
-- ═══════════════════════════════════════════════════════════

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own activity" ON drops_activity_logs;

-- 2. Create the global view policy
CREATE POLICY "Anyone can view activity" ON drops_activity_logs FOR SELECT USING (true);
