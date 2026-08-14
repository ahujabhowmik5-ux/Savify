-- =============================================
-- Auto Score Recalculation on Budget Change
-- Run this in your Supabase SQL Editor
-- =============================================

-- Trigger function: recalculates current_score when weekly_spending changes
CREATE OR REPLACE FUNCTION recalculate_score_on_budget_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weekly_spending IS DISTINCT FROM OLD.weekly_spending THEN
    IF NEW.weekly_spending > 0 THEN
      NEW.current_score := GREATEST(0, LEAST(1000,
        1000 - ROUND((NEW.current_weekly_spent::numeric / NEW.weekly_spending) * 1000)
      ));
    ELSE
      NEW.current_score := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_applications
DROP TRIGGER IF EXISTS trg_recalc_score_on_budget ON user_applications;
CREATE TRIGGER trg_recalc_score_on_budget
  BEFORE UPDATE OF weekly_spending ON user_applications
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_score_on_budget_change();
