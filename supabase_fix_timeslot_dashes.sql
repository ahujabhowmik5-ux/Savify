-- ═══════════════════════════════════════════════════════════
-- Fix time_slot encoding: normalize all dashes to standard hyphen
-- Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Replace en-dash (–) and em-dash (—) with standard hyphen (-) in all group_carts
UPDATE group_carts 
SET time_slot = REPLACE(REPLACE(time_slot, E'\u2013', '-'), E'\u2014', '-')
WHERE time_slot LIKE E'%\u2013%' OR time_slot LIKE E'%\u2014%';
