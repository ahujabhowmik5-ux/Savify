-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard → SQL Editor → New Query)
-- This updates the previous function to also clear push tokens!
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
DECLARE
    _uid UUID := auth.uid();
BEGIN
    IF _uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Delete all personal expenses
    DELETE FROM expenses WHERE user_id = _uid;

    -- 2. Delete all team/project expenses
    DELETE FROM project_expenses WHERE paid_by = _uid;

    -- 3. Delete all team memberships
    DELETE FROM project_members WHERE user_id = _uid;

    -- 4. Delete all feedback
    DELETE FROM app_feedback WHERE user_id = _uid;

    -- 5. Delete all contact messages
    DELETE FROM contact_messages WHERE user_id = _uid;

    -- 6. Delete push notification tokens (This was causing the foreign key error!)
    DELETE FROM user_push_tokens WHERE user_id = _uid;

    -- 7. Delete user profile / application
    DELETE FROM user_applications WHERE user_id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account() TO anon;
