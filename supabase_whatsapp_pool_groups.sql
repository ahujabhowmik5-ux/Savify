-- ═══════════════════════════════════════════════════════════
-- SAVIFY — WhatsApp hall-group broadcast (WaSenderAPI)
-- Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════
--
-- When someone opens a quick-commerce pool, the app broadcasts a join link to
-- the WhatsApp group(s) for the location they ordered from. This table is the
-- location -> WhatsApp group mapping.
--
-- Nothing is sent until you paste real group JIDs in (step 3 below): rows seed
-- with group_jid NULL and is_active FALSE, and the API skips those.

-- ═══════════════════════════════════════════════════════════
-- 1. Table
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS whatsapp_pool_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Preferred match: the hall the pool was started from.
    hall_id UUID REFERENCES new_halls(id) ON DELETE CASCADE,

    -- Fallback match when hall_id is unknown: the hall's short code
    -- ('LBS', 'RK', ...) or a place key ('MISC', 'TECH_MARKET').
    location_key TEXT NOT NULL,

    -- Name used inside the WhatsApp message: "pool started from LBS Hall".
    label TEXT NOT NULL,

    -- WhatsApp group JID, e.g. '120363123456789012@g.us'.
    -- Read them from GET https://www.wasenderapi.com/api/groups
    group_jid TEXT,

    -- Used when a pool has no hall match (off-campus / miscellaneous places).
    is_fallback BOOLEAN NOT NULL DEFAULT false,

    -- Flipped to true once group_jid is filled in.
    is_active BOOLEAN NOT NULL DEFAULT false,

    last_sent_at TIMESTAMPTZ,
    send_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_pool_groups_key_jid
    ON whatsapp_pool_groups (location_key, COALESCE(group_jid, ''));
CREATE INDEX IF NOT EXISTS idx_whatsapp_pool_groups_hall
    ON whatsapp_pool_groups (hall_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_whatsapp_pool_groups_fallback
    ON whatsapp_pool_groups (is_fallback) WHERE is_active;

-- Only the service role touches this table — it holds group identifiers we do
-- not want the browser reading or writing.
ALTER TABLE whatsapp_pool_groups ENABLE ROW LEVEL SECURITY;

-- Stops the same pool being broadcast twice (double tap, refresh, retry).
ALTER TABLE group_carts
    ADD COLUMN IF NOT EXISTS whatsapp_notified_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- 2. Seed one row per IIT Kharagpur hall + a miscellaneous fallback
--    (group_jid stays NULL — nothing sends yet)
-- ═══════════════════════════════════════════════════════════
INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, is_fallback)
SELECT h.id, v.location_key, v.label, false
FROM (VALUES
    -- Girls' halls
    ('MT',   'Mother Teresa Hall'),
    ('RLB',  'Rani Laxmibai Hall'),
    ('SN',   'Sarojini Naidu / Indira Gandhi Hall'),
    ('SAM',  'Sir Ashutosh Mukherjee Hall'),
    ('SNVH', 'Sister Nivedita Hall'),
    -- Boys' halls
    ('Azad', 'Azad Hall'),
    ('BCR',  'B C Roy Hall'),
    ('BRA',  'B R Ambedkar Hall'),
    ('HBH',  'Homi Bhabha Hall'),
    ('JCB',  'J C Bose Hall'),
    ('LLR',  'Lala Lajpat Rai Hall'),
    ('LBS',  'Lalbahadur Sastry Hall'),
    ('MMM',  'Madan Mohan Malviya Hall'),
    ('MS',   'Megnad Saha Hall'),
    ('Nehru','Nehru Hall'),
    ('Patel','Patel Hall'),
    ('RK',   'Radha Krishnan Hall'),
    ('RP',   'Rajendra Prasad Hall'),
    ('VS',   'Vidyasagar Hall'),
    ('GH',   'Gokhale Hall')
) AS v(location_key, label)
LEFT JOIN new_halls h ON h.name ILIKE v.location_key || ' %'
ON CONFLICT DO NOTHING;

-- Fallback group for pools started somewhere with no hall mapping
-- (day scholars, Tech Market, off-campus, GPS-only pools).
INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, is_fallback)
VALUES (NULL, 'MISC', 'IIT Kharagpur campus', true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 3. Fill in the group JIDs, then activate
-- ═══════════════════════════════════════════════════════════
-- Get the JIDs first:
--   curl -H "Authorization: Bearer $WASENDER_API_KEY" \
--        https://www.wasenderapi.com/api/groups
--
-- Then, one UPDATE per group:
--
--   UPDATE whatsapp_pool_groups
--   SET group_jid = '120363123456789012@g.us', is_active = true
--   WHERE location_key = 'LBS';
--
-- A hall with more than one group gets extra rows:
--
--   INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, group_jid, is_active)
--   SELECT hall_id, location_key, label, '120363999999999999@g.us', true
--   FROM whatsapp_pool_groups WHERE location_key = 'LBS' LIMIT 1;
--
-- Check what is wired up. hall_linked = false means the row never matched a
-- new_halls record, so pools from that hall fall through to the MISC group —
-- fix it with:  UPDATE whatsapp_pool_groups SET hall_id = '<uuid>' WHERE ...
--
--   SELECT location_key, label, is_active,
--          group_jid IS NOT NULL AS has_jid,
--          hall_id   IS NOT NULL AS hall_linked
--   FROM whatsapp_pool_groups ORDER BY is_fallback, location_key;
