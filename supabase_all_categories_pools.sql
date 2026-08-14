-- ══════════════════════════════════════════════════════════════
-- SAVIFY: All Categories Pool Types Migration
-- Adds pool types for Food, Education, Socials, and Telecom
-- Run this AFTER supabase_fix_fun_and_thrill.sql
-- ══════════════════════════════════════════════════════════════

-- ─── Food: Swiggy One ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Swiggy One Lite', 'Free delivery on food orders above ₹149. Basic savings.', '🍕', 'headcount', 2),
('Swiggy One', 'Unlimited free delivery + extra discounts on everything.', '🍕', 'headcount', 3),
('Swiggy One Annual', 'Best value — full year of Swiggy One benefits.', '🍕', 'headcount', 3)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Food: Zomato Gold ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Zomato Gold Monthly', 'Free delivery + extra discounts on food orders.', '🍔', 'headcount', 2),
('Zomato Gold Quarterly', '3 months of Zomato Gold at a great price.', '🍔', 'headcount', 3),
('Zomato Gold Annual', 'Best value — full year of Zomato Gold.', '🍔', 'headcount', 4)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Education: Udemy ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Udemy Personal Plan', 'Access top-rated courses with a monthly subscription.', '📚', 'headcount', 3),
('Udemy Team Plan', 'Team learning with advanced admin features.', '📚', 'headcount', 3)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Education: Coursera ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Coursera Plus Monthly', 'Unlimited access to 7,000+ courses, projects & certificates.', '🎓', 'headcount', 3),
('Coursera Plus Annual', 'Best value — save big with annual Coursera Plus.', '🎓', 'headcount', 4)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Socials: YouTube Premium ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('YouTube Premium Individual', 'Ad-free videos, background play & YouTube Music.', '📺', 'headcount', 2),
('YouTube Premium Family', 'Share with up to 5 family members (same household).', '📺', 'headcount', 5)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Socials: LinkedIn Premium ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('LinkedIn Premium Career', 'Stand out and get in touch with recruiters.', '💼', 'headcount', 3),
('LinkedIn Premium Business', 'For professionals looking to grow their network.', '💼', 'headcount', 3)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Telecom: Jio Family Plans ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Jio Postpaid Family ₹399', 'Primary + 1 secondary connection with shared data.', '📱', 'headcount', 2),
('Jio Postpaid Family ₹599', 'Primary + 2 secondary connections with more data.', '📱', 'headcount', 3),
('Jio Postpaid Family ₹999', 'Premium family plan with max data & OTT.', '📱', 'headcount', 4)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Telecom: Airtel Family Plans ───
INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
('Airtel Family ₹599', 'Share plan with up to 3 connections.', '📶', 'headcount', 3),
('Airtel Family ₹999', 'Premium family with 4 connections & top OTT.', '📶', 'headcount', 4),
('Airtel Family ₹1,599', 'The ultimate family plan with everything included.', '📶', 'headcount', 5)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, emoji = EXCLUDED.emoji, pool_mode = EXCLUDED.pool_mode, max_members = EXCLUDED.max_members;

-- ─── Generate slots for all new pool types ───
SELECT generate_daily_pool_slots();
