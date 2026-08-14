-- ═══════════════════════════════════════════════════════════
-- SAVIFY ACTIVITY LOGS SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE drops_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- e.g., 'JOIN_POOL', 'CREATE_POOL', 'LEAVE_POOL'
    description TEXT NOT NULL, -- e.g., 'You joined the Blinkit Pool'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE drops_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY "Users can view own activity" ON drops_activity_logs 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON drops_activity_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE drops_activity_logs;
