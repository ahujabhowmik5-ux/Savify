-- ═══════════════════════════════════════════════════════════
-- SAVIFY — Visveswaraya Guest House (VGH) + real WhatsApp group IDs
-- Run this AFTER supabase_whatsapp_pool_groups.sql.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. VGH as a hall ───────────────────────────────────────
INSERT INTO new_halls (college_id, name)
SELECT c.id, 'VGH (Visveswaraya Guest House)'
FROM new_colleges c
WHERE c.name ILIKE 'IIT Kharagpur'
  AND NOT EXISTS (
      SELECT 1 FROM new_halls h
      WHERE h.college_id = c.id AND h.name = 'VGH (Visveswaraya Guest House)'
  );

-- ─── 2. VGH in the WhatsApp mapping ─────────────────────────
INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, is_fallback)
SELECT h.id, 'VGH', 'Visveswaraya Guest House', false
FROM new_halls h
WHERE h.name = 'VGH (Visveswaraya Guest House)'
ON CONFLICT DO NOTHING;

-- ─── 3. Real group JIDs, read from the connected WaSender session ───
-- Only general hall groups are used. Hobby groups on the same account
-- (Chess LBS, Badminton LBS, E-Sports LBS, Sports Enthusiasts LBS) are
-- deliberately excluded — a grocery pool has no business in them.
--
-- These land as is_active = false. Flip them on in step 4 when you are ready
-- for real students to receive these messages.

-- LBS — 'LBS official 2025-26' and 'LBS UG'25 official group'
UPDATE whatsapp_pool_groups
SET group_jid = '120363402716317735@g.us'
WHERE location_key = 'LBS' AND group_jid IS NULL;

INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, group_jid, is_active)
SELECT hall_id, 'LBS', 'Lalbahadur Sastry Hall', '120363420040796421@g.us', false
FROM whatsapp_pool_groups
WHERE location_key = 'LBS' AND group_jid = '120363402716317735@g.us'
LIMIT 1
ON CONFLICT DO NOTHING;

-- RP — 'RP Hall 2nd Years Official' and 'RPH Junta'
UPDATE whatsapp_pool_groups
SET group_jid = '120363409875481188@g.us'
WHERE location_key = 'RP' AND group_jid IS NULL;

INSERT INTO whatsapp_pool_groups (hall_id, location_key, label, group_jid, is_active)
SELECT hall_id, 'RP', 'Radha Krishnan Hall', '120363187452135524@g.us', false
FROM whatsapp_pool_groups
WHERE location_key = 'RP' AND group_jid = '120363409875481188@g.us'
LIMIT 1
ON CONFLICT DO NOTHING;

-- MISC fallback — 'KGP Market', the campus buy/sell group.
UPDATE whatsapp_pool_groups
SET group_jid = '120363408312526900@g.us'
WHERE location_key = 'MISC' AND group_jid IS NULL;

-- ─── 4. Go live ─────────────────────────────────────────────
-- Nothing is sent until this runs. Read the group names above first and be
-- sure you want pool announcements posted into them.
--
--   UPDATE whatsapp_pool_groups
--   SET is_active = true
--   WHERE group_jid IS NOT NULL;

-- ─── 5. Check ───────────────────────────────────────────────
--   SELECT location_key, label, is_active,
--          group_jid IS NOT NULL AS has_jid,
--          hall_id   IS NOT NULL AS hall_linked
--   FROM whatsapp_pool_groups ORDER BY is_fallback, location_key;
--
-- Every hall other than LBS, RP and MISC will show has_jid = false: the Savify
-- WhatsApp number is not in any of their groups yet. Those halls fall back to
-- the MISC group until the number is added and their JID filled in.
