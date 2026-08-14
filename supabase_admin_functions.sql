-- ============================================================
-- SAVIFY ADMIN PANEL v2 — RUN THIS ENTIRE SCRIPT IN SUPABASE
-- Fixes user count (uses user_applications) + adds drill-downs
-- ============================================================

-- ─── 1. Core Metrics (FIXED: counts from user_applications) ───
CREATE OR REPLACE FUNCTION admin_get_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users',          (SELECT count(*) FROM user_applications),
    'new_users_today',      (SELECT count(*) FROM user_applications WHERE created_at >= CURRENT_DATE),
    'new_users_yesterday',  (SELECT count(*) FROM user_applications WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE),
    'new_users_this_week',  (SELECT count(*) FROM user_applications WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'new_users_last_week',  (SELECT count(*) FROM user_applications WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'),
    'premium_users',        (SELECT count(*) FROM user_applications WHERE is_premium = true),
    'total_expenses',       (SELECT count(*) FROM expenses),
    'expenses_today',       (SELECT count(*) FROM expenses WHERE created_at >= CURRENT_DATE),
    'expenses_yesterday',   (SELECT count(*) FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE),
    'expenses_this_week',   (SELECT count(*) FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'total_amount',         (SELECT COALESCE(sum(amount), 0) FROM expenses),
    'avg_expense',          (SELECT ROUND(COALESCE(avg(amount), 0)::numeric, 2) FROM expenses),
    'total_teams',          (SELECT count(*) FROM projects),
    'total_team_members',   (SELECT count(*) FROM project_members WHERE status = 'accepted'),
    'total_team_expenses',  (SELECT COALESCE(sum(amount), 0) FROM project_expenses),
    'total_feedback',       (SELECT count(*) FROM app_feedback),
    'feedback_this_week',   (SELECT count(*) FROM app_feedback WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'total_contact_msgs',   (SELECT count(*) FROM contact_messages),
    'dau',                  (SELECT count(DISTINCT e.user_id) FROM expenses e JOIN user_applications ua ON e.user_id = ua.user_id WHERE e.created_at >= CURRENT_DATE),
    'dau_yesterday',        (SELECT count(DISTINCT e.user_id) FROM expenses e JOIN user_applications ua ON e.user_id = ua.user_id WHERE e.created_at >= CURRENT_DATE - INTERVAL '1 day' AND e.created_at < CURRENT_DATE),
    'wau',                  (SELECT count(DISTINCT e.user_id) FROM expenses e JOIN user_applications ua ON e.user_id = ua.user_id WHERE e.created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'mau',                  (SELECT count(DISTINCT e.user_id) FROM expenses e JOIN user_applications ua ON e.user_id = ua.user_id WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'onboarding_dropoffs',  (SELECT count(*) FROM auth.users u LEFT JOIN user_applications ua ON ua.user_id = u.id WHERE ua.user_id IS NULL),
    'zero_value_users',     (SELECT count(*) FROM user_applications ua LEFT JOIN expenses e ON e.user_id = ua.user_id WHERE e.id IS NULL),
    'churned_users',        (SELECT count(*) FROM user_applications ua WHERE ua.user_id NOT IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AND ua.created_at < CURRENT_DATE - INTERVAL '30 days'),
    'power_users',          (SELECT count(*) FROM (SELECT user_id FROM expenses GROUP BY user_id HAVING count(*) >= 10) t)
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_metrics() TO authenticated;


-- ─── 2. Daily Signups Chart ───
CREATE OR REPLACE FUNCTION admin_get_daily_signups(days_back integer DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) FROM (
      SELECT d::date AS day, COALESCE(c.cnt, 0) AS count
      FROM generate_series(CURRENT_DATE - (days_back * INTERVAL '1 day'), CURRENT_DATE, '1 day') d
      LEFT JOIN (SELECT created_at::date AS day, count(*) AS cnt FROM user_applications WHERE created_at >= CURRENT_DATE - (days_back * INTERVAL '1 day') GROUP BY 1) c ON c.day = d::date
      ORDER BY d
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_daily_signups(integer) TO authenticated;


-- ─── 3. Daily Expenses Chart ───
CREATE OR REPLACE FUNCTION admin_get_daily_expenses(days_back integer DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) FROM (
      SELECT d::date AS day, COALESCE(c.cnt, 0) AS count, COALESCE(c.total, 0) AS total
      FROM generate_series(CURRENT_DATE - (days_back * INTERVAL '1 day'), CURRENT_DATE, '1 day') d
      LEFT JOIN (SELECT created_at::date AS day, count(*) AS cnt, sum(amount) AS total FROM expenses WHERE created_at >= CURRENT_DATE - (days_back * INTERVAL '1 day') GROUP BY 1) c ON c.day = d::date
      ORDER BY d
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_daily_expenses(integer) TO authenticated;


-- ─── 4. Category Breakdown ───
CREATE OR REPLACE FUNCTION admin_get_category_breakdown()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT category, count(*) AS count, ROUND(sum(amount)::numeric, 2) AS total FROM expenses GROUP BY category ORDER BY count DESC
  ) t);
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_category_breakdown() TO authenticated;


-- ─── 5. Recent Users ───
CREATE OR REPLACE FUNCTION admin_get_recent_users(lim integer DEFAULT 25)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
    SELECT u.id AS user_id, u.email, u.created_at AS signed_up_at, ua.full_name, ua.college, ua.is_premium, ua.weekly_spending
    FROM auth.users u LEFT JOIN user_applications ua ON ua.user_id = u.id
    ORDER BY u.created_at DESC LIMIT lim
  ) t);
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_recent_users(integer) TO authenticated;


-- ═══════════════════════════════════════════
-- DRILL-DOWN FUNCTIONS (click a metric → see details)
-- ═══════════════════════════════════════════

-- ─── 6. Drill: Users by filter ───
CREATE OR REPLACE FUNCTION admin_drill_users(filter_type text DEFAULT 'all')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT ua.user_id, u.email, ua.full_name, ua.college,
             ua.weekly_spending, ua.current_weekly_spent,
             ua.is_premium, ua.current_score,
             u.created_at AS signed_up_at, u.last_sign_in_at
      FROM user_applications ua
      JOIN auth.users u ON u.id = ua.user_id
      WHERE CASE filter_type
        WHEN 'all' THEN true
        WHEN 'today' THEN ua.created_at >= CURRENT_DATE
        WHEN 'yesterday' THEN ua.created_at >= CURRENT_DATE - INTERVAL '1 day' AND ua.created_at < CURRENT_DATE
        WHEN 'this_week' THEN ua.created_at >= CURRENT_DATE - INTERVAL '7 days'
        WHEN 'last_week' THEN ua.created_at >= CURRENT_DATE - INTERVAL '14 days' AND ua.created_at < CURRENT_DATE - INTERVAL '7 days'
        WHEN 'premium' THEN ua.is_premium = true
        WHEN 'dau' THEN ua.user_id IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE)
        WHEN 'dau_yesterday' THEN ua.user_id IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE)
        WHEN 'wau' THEN ua.user_id IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
        WHEN 'mau' THEN ua.user_id IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
        WHEN 'zero_value' THEN ua.user_id NOT IN (SELECT DISTINCT user_id FROM expenses)
        WHEN 'churned' THEN ua.user_id NOT IN (SELECT DISTINCT user_id FROM expenses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AND ua.created_at < CURRENT_DATE - INTERVAL '30 days'
        WHEN 'power_users' THEN ua.user_id IN (SELECT user_id FROM expenses GROUP BY user_id HAVING count(*) >= 10)
        ELSE true
      END
      ORDER BY u.created_at DESC LIMIT 500
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_users(text) TO authenticated;

-- ─── 6b. Drill: Onboarding Dropoffs ───
CREATE OR REPLACE FUNCTION admin_drill_dropoffs()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT u.id AS user_id, u.email, u.created_at AS signed_up_at, u.last_sign_in_at
      FROM auth.users u
      LEFT JOIN user_applications ua ON ua.user_id = u.id
      WHERE ua.user_id IS NULL
      ORDER BY u.created_at DESC LIMIT 500
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_dropoffs() TO authenticated;


-- ─── 7. Drill: Expenses by filter ───
CREATE OR REPLACE FUNCTION admin_drill_expenses(filter_type text DEFAULT 'all')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT e.id, e.amount, e.category, e.description, e.created_at,
             ua.full_name, u.email
      FROM expenses e
      LEFT JOIN auth.users u ON u.id = e.user_id
      LEFT JOIN user_applications ua ON ua.user_id = e.user_id
      WHERE CASE filter_type
        WHEN 'all' THEN true
        WHEN 'today' THEN e.created_at >= CURRENT_DATE
        WHEN 'yesterday' THEN e.created_at >= CURRENT_DATE - INTERVAL '1 day' AND e.created_at < CURRENT_DATE
        WHEN 'this_week' THEN e.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ELSE true
      END
      ORDER BY e.created_at DESC LIMIT 500
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_expenses(text) TO authenticated;


-- ─── 8. Drill: Teams ───
CREATE OR REPLACE FUNCTION admin_drill_teams()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT p.id, p.name, p.join_code, p.created_at,
             (SELECT count(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.status = 'accepted') AS member_count,
             (SELECT COALESCE(sum(pe.amount), 0) FROM project_expenses pe WHERE pe.project_id = p.id) AS total_spent,
             (SELECT ua.full_name FROM user_applications ua WHERE ua.user_id = p.created_by LIMIT 1) AS created_by_name
      FROM projects p ORDER BY p.created_at DESC
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_teams() TO authenticated;


-- ─── 9. Drill: Feedback ───
CREATE OR REPLACE FUNCTION admin_drill_feedback()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT f.*, ua.full_name, u.email
      FROM app_feedback f
      LEFT JOIN auth.users u ON u.id = f.user_id
      LEFT JOIN user_applications ua ON ua.user_id = f.user_id
      ORDER BY f.created_at DESC LIMIT 200
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_feedback() TO authenticated;


-- ─── 10. Drill: Contact Messages ───
CREATE OR REPLACE FUNCTION admin_drill_contacts()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT c.*, ua.full_name, u.email
      FROM contact_messages c
      LEFT JOIN auth.users u ON u.id = c.user_id
      LEFT JOIN user_applications ua ON ua.user_id = c.user_id
      ORDER BY c.created_at DESC LIMIT 200
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_drill_contacts() TO authenticated;


-- ═══════════════════════════════════════════
-- D2C BRAND / PROMOTIONS TRACKING
-- ═══════════════════════════════════════════

-- Ensure the tables have a clicks column
-- DO $$ BEGIN
--   ALTER TABLE promotions ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;
--   ALTER TABLE promotions2 ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;
--   ALTER TABLE promotions3 ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;
-- EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─── 11. Fetch D2C Brand Stats ───
CREATE OR REPLACE FUNCTION admin_get_d2c_promotions()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT id, title, link_url, COALESCE(clicks, 0) as clicks, created_at, 'promotions' as table_source FROM promotions
      UNION ALL
      SELECT id, title, link_url, COALESCE(clicks, 0) as clicks, created_at, 'promotions2' as table_source FROM promotions2
      UNION ALL
      SELECT id, title, link_url, COALESCE(clicks, 0) as clicks, created_at, 'promotions3' as table_source FROM promotions3
      ORDER BY clicks DESC, created_at DESC
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_d2c_promotions() TO authenticated;

-- ─── 12. Public RPC to Increment Click ───
CREATE OR REPLACE FUNCTION increment_promotion_click(promo_id uuid, table_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF table_name = 'promotions' THEN
    UPDATE promotions SET clicks = COALESCE(clicks, 0) + 1 WHERE id = promo_id;
  ELSIF table_name = 'promotions2' THEN
    UPDATE promotions2 SET clicks = COALESCE(clicks, 0) + 1 WHERE id = promo_id;
  ELSIF table_name = 'promotions3' THEN
    UPDATE promotions3 SET clicks = COALESCE(clicks, 0) + 1 WHERE id = promo_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION increment_promotion_click(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promotion_click(uuid, text) TO anon;


-- ═══════════════════════════════════════════
-- ADMIN CAMPAIGNS TABLE & RPCS
-- ═══════════════════════════════════════════

-- ─── Table ───
CREATE TABLE IF NOT EXISTS admin_campaigns (
  id text PRIMARY KEY,
  creator_name text NOT NULL,
  user_name text NOT NULL,
  platform text NOT NULL,
  amount text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  description text DEFAULT '',
  is_live boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Lock down: no public access, only via RPCs
ALTER TABLE admin_campaigns ENABLE ROW LEVEL SECURITY;

-- ─── 13. Fetch all campaigns ───
CREATE OR REPLACE FUNCTION admin_get_campaigns()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
      SELECT * FROM admin_campaigns ORDER BY created_at DESC
    ) t
  );
END; $$;
GRANT EXECUTE ON FUNCTION admin_get_campaigns() TO authenticated;

-- ─── 14. Add a new campaign ───
CREATE OR REPLACE FUNCTION admin_add_campaign(
  p_id text, p_creator_name text, p_user_name text, p_platform text,
  p_amount text, p_start_date text, p_end_date text, p_description text DEFAULT ''
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO admin_campaigns (id, creator_name, user_name, platform, amount, start_date, end_date, description)
  VALUES (p_id, p_creator_name, p_user_name, p_platform, p_amount, p_start_date, p_end_date, p_description)
  ON CONFLICT (id) DO UPDATE SET
    creator_name = EXCLUDED.creator_name, user_name = EXCLUDED.user_name,
    platform = EXCLUDED.platform, amount = EXCLUDED.amount,
    start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
    description = EXCLUDED.description;
END; $$;
GRANT EXECUTE ON FUNCTION admin_add_campaign(text,text,text,text,text,text,text,text) TO authenticated;

-- ─── 15. Toggle campaign live/ended ───
CREATE OR REPLACE FUNCTION admin_toggle_campaign(p_id text, p_is_live boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email NOT IN ('bhowmikahuja7@gmail.com', 'anantbhaidav@gmail.com') THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE admin_campaigns SET is_live = p_is_live WHERE id = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION admin_toggle_campaign(text, boolean) TO authenticated;

