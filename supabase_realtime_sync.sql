-- ═══════════════════════════════════════════════════════════
-- SAVIFY REALTIME SYNC MIGRATION
-- Run this in Supabase SQL Editor to enable real-time updates
-- for Tinder-style syncing of connections (Matches, Liked You)
-- ═══════════════════════════════════════════════════════════

-- Enable real-time for the roommate_swipes table
alter publication supabase_realtime add table roommate_swipes;
