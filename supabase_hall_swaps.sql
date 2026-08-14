-- View for Hall Swap Matches
-- This view automatically finds pairs of users who have mutually matching swap requests.

CREATE OR REPLACE VIEW hall_swap_matches_view AS
SELECT 
    r1.id AS request1_id,
    r1.user_id AS user1_id,
    r1.current_hall_id AS user1_current_hall_id,
    r1.desired_hall_id AS user1_desired_hall_id,
    r1.created_at AS user1_requested_at,
    r2.id AS request2_id,
    r2.user_id AS user2_id,
    r2.current_hall_id AS user2_current_hall_id,
    r2.desired_hall_id AS user2_desired_hall_id,
    r2.created_at AS user2_requested_at
FROM hall_swap_requests r1
JOIN hall_swap_requests r2 
  ON r1.current_hall_id = r2.desired_hall_id 
  AND r1.desired_hall_id = r2.current_hall_id
  AND r1.user_id < r2.user_id;
