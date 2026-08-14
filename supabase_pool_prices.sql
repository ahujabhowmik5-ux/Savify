-- ═══════════════════════════════════════════════════════════
-- SAVIFY — Give every pool a real split price
--
-- pool_types.split_price was only ever populated for the plans seeded by
-- seed_pools_new.sql (Netflix, Spotify, Jio Hotstar, ChatGPT, Google AI).
-- Everything seeded by supabase_all_categories_pools.sql and
-- supabase_fix_fun_and_thrill.sql - Swiggy, Zomato, Prime Video, Udemy,
-- Coursera, YouTube, LinkedIn, Jio, Airtel, Claude - was left at 0.
--
-- Users were charged correctly (the price comes from the pricing modal), but
-- every report that reads split_price showed those orders as Rs.0: the user's
-- Orders tab, the admin "PAID Rs." badge, and pool revenue. That is why
-- Netflix looked fine and Swiggy looked broken.
--
-- Prices below are generated from the splitPrice values in
-- SubscriptionPoolModal.jsx and AIPricingModal.jsx - the amounts actually
-- charged at checkout - so reports and charges cannot disagree.
-- ═══════════════════════════════════════════════════════════

UPDATE pool_types SET split_price = v.price, max_members = COALESCE(pool_types.max_members, v.cap)
FROM (VALUES
  ('Netflix Standard', 250, 2),
  ('Netflix Premium', 162, 4),
  ('Netflix Mobile', 75, 2),
  ('Netflix Basic', 100, 2),
  ('Spotify Standard', 70, 2),
  ('Spotify Platinum', 100, 3),
  ('Spotify Student', 35, 2),
  ('Prime Video Monthly', 60, 5),
  ('Prime Video Quarterly', 120, 5),
  ('Prime Video Annual', 300, 5),
  ('Jio Hotstar Mobile 1 Month', 40, 2),
  ('Jio Hotstar Mobile 3 Month', 75, 2),
  ('Jio Hotstar Mobile 1 Year', 250, 2),
  ('Jio Hotstar Super 1 Month', 75, 2),
  ('Jio Hotstar Super 3 Month', 175, 2),
  ('Jio Hotstar Super 1 Year', 550, 2),
  ('Jio Hotstar Premium 1 Month', 75, 4),
  ('Jio Hotstar Premium 3 Month', 175, 4),
  ('Jio Hotstar Premium 1 Year', 550, 4),
  ('Swiggy One Lite', 50, 2),
  ('Swiggy One', 50, 3),
  ('Swiggy One Annual', 333, 3),
  ('Zomato Gold Monthly', 75, 2),
  ('Zomato Gold Quarterly', 100, 3),
  ('Zomato Gold Annual', 250, 4),
  ('Udemy Personal Plan', 283, 3),
  ('Udemy Team Plan', 356, 3),
  ('Coursera Plus Monthly', 1389, 3),
  ('Coursera Plus Annual', 7375, 4),
  ('YouTube Premium Individual', 75, 2),
  ('YouTube Premium Family', 38, 5),
  ('LinkedIn Premium Career', 518, 3),
  ('LinkedIn Premium Business', 700, 3),
  ('Jio Postpaid Family ₹399', 200, 2),
  ('Jio Postpaid Family ₹599', 200, 3),
  ('Jio Postpaid Family ₹999', 250, 4),
  ('Airtel Family ₹599', 200, 3),
  ('Airtel Family ₹999', 250, 4),
  ('Airtel Family ₹1,599', 320, 5),
  ('ChatGPT Individual GO', 133, 3),
  ('ChatGPT Individual PLUS', 666, 3),
  ('ChatGPT Individual PRO', 3566, 3),
  ('ChatGPT Business', 600, 3),
  ('Claude Pro', 650, 3),
  ('Claude Max', 3250, 3),
  ('Claude Team', 800, 3),
  ('Google AI Plus', 133, 3),
  ('Google AI Pro', 650, 3),
  ('Google AI Ultra 5x', 2166, 3),
  ('Google AI Ultra 20x', 6500, 3)
) AS v(name, price, cap)
WHERE pool_types.name = v.name;

-- Verify: this should return no rows.
-- SELECT name, pool_mode, split_price, max_members
-- FROM pool_types
-- WHERE pool_mode = 'headcount' AND COALESCE(split_price, 0) = 0
-- ORDER BY name;
