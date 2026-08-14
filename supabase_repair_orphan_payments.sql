-- ═══════════════════════════════════════════════════════════
-- SAVIFY — Give seats to payments that succeeded but never got one
--
-- Some successful payments never produced a pool_members row, so the user was
-- charged and then saw no order anywhere. Two causes:
--   1. The status-check fallback was returning HTML instead of JSON, so the
--      only route to fulfilment was the webhook. If that missed, nothing
--      retried. (Fixed in the code; status checks now self-heal.)
--   2. Older orders stored context_id = 'sub_pool' because create-order did not
--      resolve the plan to a slot. Both the webhook and the status check skip
--      that placeholder, so the seat could never be placed at all.
--
-- Run STEP 1 to see what is affected, STEP 2 to repair what can be repaired.
-- ═══════════════════════════════════════════════════════════

-- ─── STEP 1: inspect (read-only) ────────────────────────────
SELECT t.created_at::date        AS paid_on,
       t.amount,
       t.plan_name,
       t.context_id,
       CASE
         WHEN t.context_id IN ('sub_pool', 'headcount') THEN 'placeholder - needs manual assignment'
         WHEN ps.id IS NULL                             THEN 'slot no longer exists'
         ELSE pt.name || ' (' || ps.status || ')'
       END AS destination
FROM phonepe_transactions t
LEFT JOIN pool_slots ps ON ps.id::text = t.context_id
LEFT JOIN pool_types pt ON pt.id = ps.pool_type_id
WHERE t.status = 'SUCCESS'
  AND t.context_type IN ('pool', 'subscription')
  AND NOT EXISTS (
    SELECT 1 FROM pool_members pm
    WHERE pm.pool_slot_id::text = t.context_id
      AND pm.user_id = t.user_id
  )
ORDER BY t.created_at DESC;

-- ─── STEP 2: repair the ones that point at a real slot ──────
INSERT INTO pool_members (pool_slot_id, user_id, display_name, payment_status, paid_at)
SELECT ps.id,
       t.user_id,
       COALESCE(up.full_name, 'Anonymous'),
       'paid',
       t.created_at
FROM phonepe_transactions t
JOIN pool_slots ps ON ps.id::text = t.context_id
LEFT JOIN user_profiles up ON up.id = t.user_id
WHERE t.status = 'SUCCESS'
  AND t.context_type IN ('pool', 'subscription')
  AND NOT EXISTS (
    SELECT 1 FROM pool_members pm
    WHERE pm.pool_slot_id = ps.id AND pm.user_id = t.user_id
  )
ON CONFLICT (pool_slot_id, user_id) DO NOTHING;

-- The insert fires the capacity trigger, so any pool this pushes to full is
-- completed and reopened automatically.

-- ─── STEP 3: what could NOT be repaired ─────────────────────
-- Orders stored against the 'sub_pool' placeholder carry no plan name, so the
-- plan cannot be inferred (an amount like 75 matches several plans). Assign
-- these by hand once you have identified the buyer's intended plan:
--
--   SELECT t.merchant_transaction_id, t.created_at, t.amount, t.user_id,
--          up.full_name, up.mobile_number, up.email
--   FROM phonepe_transactions t
--   LEFT JOIN user_profiles up ON up.id = t.user_id
--   WHERE t.status = 'SUCCESS' AND t.context_id IN ('sub_pool', 'headcount');
--
-- Then, with the chosen plan name:
--
--   INSERT INTO pool_members (pool_slot_id, user_id, display_name, payment_status, paid_at)
--   VALUES (ensure_running_slot_for_pool(
--             (SELECT id FROM pool_types WHERE name = '<PLAN NAME>')),
--           '<USER UUID>', '<NAME>', 'paid', now())
--   ON CONFLICT (pool_slot_id, user_id) DO NOTHING;

-- ─── Verify: STEP 1 should now only return placeholder rows ───
