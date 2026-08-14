-- =============================================
-- Force Budget Reset for Existing Users
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add the column to track who has completed the budget reset
-- This will default to NULL (which acts like false) for the existing 261 users.
-- New users will be explicitly inserted with TRUE by the updated codebase.
ALTER TABLE user_applications 
ADD COLUMN IF NOT EXISTS budget_reset_done BOOLEAN DEFAULT false;
