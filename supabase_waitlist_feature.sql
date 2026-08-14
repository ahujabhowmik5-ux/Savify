-- ═══════════════════════════════════════════════════════════
-- SAVIFY WAITLIST MIGRATION
-- Run this in Supabase SQL Editor to create the waitlist
-- for Fun & Thrill, AI Subscriptions, and Food.
-- ═══════════════════════════════════════════════════════════

-- Drop the old table if it exists so we can recreate it with the correct columns
DROP TABLE IF EXISTS public.waitlist CASCADE;

CREATE TABLE public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, category) -- Prevent duplicate waitlisting per category
);

-- Enable RLS and add basic policies
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own waitlist entries"
    ON public.waitlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own waitlist entries"
    ON public.waitlist FOR SELECT
    USING (auth.uid() = user_id);
