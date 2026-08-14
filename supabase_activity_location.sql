-- ═══════════════════════════════════════════════════════════
-- SAVIFY ACTIVITY LOCATION MIGRATION
-- Run this in Supabase SQL Editor to add location tracking
-- to activity logs for 200m radius filtering
-- ═══════════════════════════════════════════════════════════

-- Add latitude and longitude columns to drops_activity_logs
ALTER TABLE drops_activity_logs
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_location
ON drops_activity_logs (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN drops_activity_logs.latitude IS 'User latitude at the time of activity creation';
COMMENT ON COLUMN drops_activity_logs.longitude IS 'User longitude at the time of activity creation';
