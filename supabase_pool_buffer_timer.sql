-- ═══════════════════════════════════════════════════════════
-- SAVIFY — 15-minute pool window + 10-minute buffer
-- Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════
--
-- The quick-commerce pool used to run one flat 30-minute window. It now runs
-- in two phases:
--
--   expires_at         creation + 15 min — the window shown to users.
--   buffer_expires_at  creation + 25 min — the hard deadline.
--
-- Between the two the app shows a red buffer countdown and the pool stays
-- joinable. The pool only auto-completes once buffer_expires_at passes without
-- the free-delivery threshold being met.
--
-- The app tolerates this column being absent (it falls back to
-- expires_at + 10 minutes), so running this migration is safe at any time and
-- nothing breaks if it is delayed.

-- 1. The hard deadline.
ALTER TABLE group_carts
    ADD COLUMN IF NOT EXISTS buffer_expires_at TIMESTAMPTZ;

-- 2. Backfill open pools created under the old 30-minute rule so their
--    remaining time is not silently extended.
UPDATE group_carts
SET buffer_expires_at = expires_at
WHERE buffer_expires_at IS NULL
  AND expires_at IS NOT NULL;

-- 3. New rows written by a client that predates this change still get a
--    sensible hard deadline.
ALTER TABLE group_carts
    ALTER COLUMN buffer_expires_at SET DEFAULT (now() + interval '25 minutes');

-- 4. Discovery filters on the buffer deadline, so index it.
CREATE INDEX IF NOT EXISTS idx_group_carts_buffer_expires_at
    ON group_carts (status, buffer_expires_at);
