-- ═══════════════════════════════════════════════════════════
-- SAVIFY — Make "Fulfill & Send Credentials" actually work
--
-- pool_members has RLS enabled with SELECT / INSERT / DELETE policies but
-- NO UPDATE policy, so the admin panel's `update({ status: 'done' })` was
-- silently rejected: PostgREST returned 200 with zero rows affected and no
-- error, so the button looked like it did nothing but show a confirm dialog.
--
-- Same pattern as complete_pool_slot(): go through a security-definer RPC.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE pool_members ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION fulfill_pool_member(p_member_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  -- Only a paid seat can be fulfilled; an unpaid row is an abandoned checkout.
  UPDATE pool_members
  SET status = 'done',
      fulfilled_at = COALESCE(fulfilled_at, now())
  WHERE id = p_member_id
    AND COALESCE(payment_status, 'paid') = 'paid';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Undo, in case something is marked fulfilled by mistake.
CREATE OR REPLACE FUNCTION unfulfill_pool_member(p_member_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE pool_members
  SET status = 'pending', fulfilled_at = NULL
  WHERE id = p_member_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Granted to authenticated only (the admin signs in with an OTP), not anon.
GRANT EXECUTE ON FUNCTION fulfill_pool_member(UUID)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION unfulfill_pool_member(UUID) TO authenticated, service_role;

-- ─── Optional hardening ─────────────────────────────────────
-- Any signed-in user can currently call these. To restrict them to your admin
-- accounts, uncomment the guard below and re-run this file. Remember to keep
-- the list in step with ADMIN_EMAILS in client/src/pages/AdminPanelPage.jsx.
--
-- CREATE OR REPLACE FUNCTION assert_is_admin() RETURNS void
-- SECURITY DEFINER SET search_path = public, auth AS $$
-- BEGIN
--   IF (SELECT email FROM auth.users WHERE id = auth.uid())
--      NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN
--     RAISE EXCEPTION 'Not authorised';
--   END IF;
-- END; $$ LANGUAGE plpgsql;
-- -- then add `PERFORM assert_is_admin();` as the first line of each function above.

-- Sanity check — should return true, then show the row as done:
-- SELECT fulfill_pool_member('<member_id>');
-- SELECT id, status, payment_status, fulfilled_at FROM pool_members WHERE id = '<member_id>';
