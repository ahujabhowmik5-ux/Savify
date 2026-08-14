-- ═══════════════════════════════════════════════════════════
-- SAVIFY POOLS — Paid-seat tracking & auto-refresh on completion
-- Run this ONCE in Supabase SQL Editor.
--
-- What it does:
--   1. Adds payment_status / paid_at to pool_members so a seat is only
--      counted once the money has actually landed.
--   2. Backfills existing rows from phonepe_transactions.
--   3. Fills in the missing max_members on subscription pool types
--      (seed_pools_new.sql inserted them without a capacity).
--   4. Replaces the (pool_type_id, slot_date, slot_start) unique constraint
--      with a partial unique index that only applies to RUNNING slots, so a
--      pool type can have many completed slots + exactly one live slot per day.
--   5. complete_pool_slot() — closes a slot and immediately opens a fresh
--      empty one, so the plate goes back to 0/N.
--   6. Trigger — auto-completes a pool the moment its paid seats hit capacity.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Seat payment tracking ───────────────────────────────
-- Default is 'paid' so free/legacy joins keep counting; the pay-first flow
-- writes 'pending' explicitly and flips it to 'paid' on gateway confirmation.
ALTER TABLE pool_members ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
ALTER TABLE pool_members ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE pool_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ─── 2. Backfill ────────────────────────────────────────────
-- Anything on a paid pool type that never produced a SUCCESS transaction was
-- an abandoned checkout — it should not be holding a seat.
UPDATE pool_members pm
SET payment_status = 'pending'
WHERE pm.payment_status = 'paid'
  AND pm.paid_at IS NULL
  AND COALESCE(pm.status, 'pending') <> 'done'
  AND EXISTS (
    SELECT 1 FROM pool_slots ps
    JOIN pool_types pt ON pt.id = ps.pool_type_id
    WHERE ps.id = pm.pool_slot_id
      AND COALESCE(pt.split_price, 0) > 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM phonepe_transactions t
    WHERE t.user_id = pm.user_id
      AND t.status = 'SUCCESS'
      AND t.context_id = pm.pool_slot_id::text
  );

-- Anything with a confirmed transaction is definitively paid.
UPDATE pool_members pm
SET payment_status = 'paid',
    paid_at = COALESCE(pm.paid_at, pm.joined_at)
WHERE EXISTS (
    SELECT 1 FROM phonepe_transactions t
    WHERE t.user_id = pm.user_id
      AND t.status = 'SUCCESS'
      AND t.context_id = pm.pool_slot_id::text
  );

CREATE INDEX IF NOT EXISTS idx_pool_members_slot_payment
  ON pool_members (pool_slot_id, payment_status);

-- The gateway records which plan was bought, so a webhook can still find the
-- right pool if the slot the client sent has since been completed.
ALTER TABLE phonepe_transactions ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- ─── 3. Missing capacities on subscription pool types ───────
-- seed_pools_new.sql inserted these without max_members, which left every
-- plate with an unknown capacity and made auto-completion impossible.
UPDATE pool_types SET max_members = v.cap
FROM (VALUES
  ('Netflix Standard', 2), ('Netflix Premium', 4), ('Netflix Mobile', 2), ('Netflix Basic', 2),
  ('Spotify Standard', 2), ('Spotify Platinum', 3), ('Spotify Student', 2),
  ('Jio Hotstar Mobile 1 Month', 2), ('Jio Hotstar Mobile 3 Month', 2), ('Jio Hotstar Mobile 1 Year', 2),
  ('Jio Hotstar Super 1 Month', 2), ('Jio Hotstar Super 3 Month', 2), ('Jio Hotstar Super 1 Year', 2),
  ('Jio Hotstar Premium 1 Month', 4), ('Jio Hotstar Premium 3 Month', 4), ('Jio Hotstar Premium 1 Year', 4),
  ('ChatGPT Individual GO', 3), ('ChatGPT Individual PLUS', 3), ('ChatGPT Individual PRO', 3), ('ChatGPT Business', 3),
  ('Google AI Plus', 3), ('Google AI Pro', 3), ('Google AI Ultra 5x', 3), ('Google AI Ultra 20x', 3),
  ('Claude Pro', 3), ('Claude Max', 3), ('Claude Team', 3)
) AS v(name, cap)
WHERE pool_types.name = v.name
  AND (pool_types.max_members IS NULL OR pool_types.max_members = 0);

-- Last-resort guard: a headcount pool with no capacity can never complete.
UPDATE pool_types SET max_members = 3
WHERE pool_mode = 'headcount' AND (max_members IS NULL OR max_members = 0);

-- ─── 4. One RUNNING slot per pool type per day (many completed) ───
ALTER TABLE pool_slots
  DROP CONSTRAINT IF EXISTS pool_slots_pool_type_id_slot_date_slot_start_key;

-- Historical duplicates would break the new index. For each headcount pool type
-- keep a single live slot — the one holding the most paid seats, newest wins a
-- tie — and archive the rest as completed (they stay visible in the admin panel).
WITH ranked AS (
  SELECT ps.id,
         ROW_NUMBER() OVER (
           PARTITION BY ps.pool_type_id
           ORDER BY (
             SELECT COUNT(*) FROM pool_members pm
             WHERE pm.pool_slot_id = ps.id
               AND COALESCE(pm.payment_status, 'paid') = 'paid'
           ) DESC,
           ps.created_at DESC
         ) AS rn
  FROM pool_slots ps
  JOIN pool_types pt ON pt.id = ps.pool_type_id
  WHERE ps.status = 'running' AND pt.pool_mode = 'headcount'
)
UPDATE pool_slots SET status = 'completed'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Same cleanup for timeslot pools, which legitimately have one slot per window.
WITH ranked AS (
  SELECT ps.id,
         ROW_NUMBER() OVER (
           PARTITION BY ps.pool_type_id, ps.slot_date, ps.slot_start
           ORDER BY ps.created_at ASC
         ) AS rn
  FROM pool_slots ps
  JOIN pool_types pt ON pt.id = ps.pool_type_id
  WHERE ps.status = 'running' AND pt.pool_mode = 'timeslot'
)
UPDATE pool_slots SET status = 'completed'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS pool_slots_one_running_per_day
  ON pool_slots (pool_type_id, slot_date, slot_start)
  WHERE status = 'running';

-- generate_daily_pool_slots() referenced the constraint we just dropped, so it
-- has to be rewritten against the new index (NOT EXISTS instead of ON CONFLICT).
CREATE OR REPLACE FUNCTION generate_daily_pool_slots()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 4-hour windows for timeslot pools (Blinkit & friends)
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  SELECT pt.id, CURRENT_DATE, s.slot_start, s.slot_end, 'running'
  FROM pool_types pt
  CROSS JOIN (VALUES
    ('12:00 AM', '4:00 AM'),
    ('4:00 AM',  '8:00 AM'),
    ('8:00 AM',  '12:00 PM'),
    ('12:00 PM', '4:00 PM'),
    ('4:00 PM',  '8:00 PM'),
    ('8:00 PM',  '12:00 AM')
  ) AS s(slot_start, slot_end)
  WHERE pt.pool_mode = 'timeslot'
    AND NOT EXISTS (
      SELECT 1 FROM pool_slots ps
      WHERE ps.pool_type_id = pt.id
        AND ps.slot_date = CURRENT_DATE
        AND ps.slot_start = s.slot_start
    );

  -- Exactly one live "All Day" slot per headcount pool. If the current one is
  -- completed we open a fresh (empty) one — that is what resets the plate to 0.
  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  SELECT pt.id, CURRENT_DATE, 'All Day', 'All Day', 'running'
  FROM pool_types pt
  WHERE pt.pool_mode = 'headcount'
    AND NOT EXISTS (
      SELECT 1 FROM pool_slots ps
      WHERE ps.pool_type_id = pt.id
        AND ps.status = 'running'
    );
END;
$$ LANGUAGE plpgsql;

-- ─── 5. Close a pool and immediately reopen an empty one ────
CREATE OR REPLACE FUNCTION complete_pool_slot(p_slot_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_id UUID;
  v_start   TEXT;
  v_end     TEXT;
  v_new_id  UUID;
BEGIN
  UPDATE pool_slots
  SET status = 'completed'
  WHERE id = p_slot_id AND status <> 'completed'
  RETURNING pool_type_id, slot_start, slot_end INTO v_type_id, v_start, v_end;

  IF v_type_id IS NULL THEN
    RETURN NULL; -- already completed, or no such slot
  END IF;

  -- Only headcount pools roll over into a fresh pool; timeslot windows are
  -- tied to a clock and are regenerated by generate_daily_pool_slots().
  IF NOT EXISTS (
    SELECT 1 FROM pool_types WHERE id = v_type_id AND pool_mode = 'headcount'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_new_id
  FROM pool_slots
  WHERE pool_type_id = v_type_id AND status = 'running'
  LIMIT 1;

  IF v_new_id IS NOT NULL THEN
    RETURN v_new_id; -- a live pool already exists, nothing to open
  END IF;

  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  VALUES (v_type_id, CURRENT_DATE, COALESCE(v_start, 'All Day'), COALESCE(v_end, 'All Day'), 'running')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION complete_pool_slot(UUID) TO authenticated, anon, service_role;

-- pool_slots has RLS with a SELECT-only policy, so the browser cannot open a
-- slot itself. This gives it a safe, definer-owned way to get the live slot.
CREATE OR REPLACE FUNCTION ensure_running_slot_for_pool(p_pool_type_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  SELECT id INTO v_slot_id
  FROM pool_slots
  WHERE pool_type_id = p_pool_type_id AND status = 'running'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_slot_id IS NOT NULL THEN
    RETURN v_slot_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pool_types WHERE id = p_pool_type_id AND pool_mode = 'headcount'
  ) THEN
    RETURN NULL; -- timeslot windows are only created by generate_daily_pool_slots()
  END IF;

  INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end, status)
  VALUES (p_pool_type_id, CURRENT_DATE, 'All Day', 'All Day', 'running')
  RETURNING id INTO v_slot_id;

  RETURN v_slot_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION ensure_running_slot_for_pool(UUID) TO authenticated, anon, service_role;

-- ─── 6. Auto-complete the moment paid seats reach capacity ──
CREATE OR REPLACE FUNCTION pool_members_autocomplete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id  UUID := COALESCE(NEW.pool_slot_id, OLD.pool_slot_id);
  v_max      INT;
  v_mode     TEXT;
  v_status   TEXT;
  v_paid     INT;
BEGIN
  SELECT pt.max_members, pt.pool_mode, ps.status
  INTO v_max, v_mode, v_status
  FROM pool_slots ps
  JOIN pool_types pt ON pt.id = ps.pool_type_id
  WHERE ps.id = v_slot_id;

  IF v_mode <> 'headcount' OR v_max IS NULL OR v_max <= 0 OR v_status = 'completed' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_paid
  FROM pool_members
  WHERE pool_slot_id = v_slot_id
    AND COALESCE(payment_status, 'paid') = 'paid';

  IF v_paid >= v_max THEN
    PERFORM complete_pool_slot(v_slot_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_members_autocomplete ON pool_members;
CREATE TRIGGER trg_pool_members_autocomplete
AFTER INSERT OR UPDATE OF payment_status ON pool_members
FOR EACH ROW EXECUTE FUNCTION pool_members_autocomplete();

-- ─── 7. Realtime so plates refresh without a page reload ────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pool_slots;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pool_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. Make sure every headcount pool has a live slot right now ───
SELECT generate_daily_pool_slots();

-- Sanity check:
-- SELECT pt.name, ps.status, ps.slot_date,
--        COUNT(pm.id) FILTER (WHERE pm.payment_status = 'paid') AS paid_seats,
--        pt.max_members
-- FROM pool_types pt
-- JOIN pool_slots ps ON ps.pool_type_id = pt.id
-- LEFT JOIN pool_members pm ON pm.pool_slot_id = ps.id
-- WHERE pt.pool_mode = 'headcount'
-- GROUP BY pt.name, ps.status, ps.slot_date, pt.max_members
-- ORDER BY pt.name;
