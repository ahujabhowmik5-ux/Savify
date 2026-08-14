-- ══════════════════════════════════════════════════════════════
-- Fun & Thrill Subscription Pools Migration
-- Adds pool types for Netflix, Spotify, Prime Video, and Jio Hotstar
-- ══════════════════════════════════════════════════════════════

INSERT INTO pool_types (name, description, emoji, pool_mode, max_members) VALUES
-- Netflix
('Netflix Standard', 'Great video quality in 1080p. Watch on 2 supported devices at a time.', '🍿', 'headcount', 2),
('Netflix Premium', 'Best video quality in 4K+HDR. Watch on 4 supported devices at a time.', '🍿', 'headcount', 4),

-- Spotify
('Spotify Premium Duo', '2 Premium accounts for a couple under one roof.', '🎵', 'headcount', 2),
('Spotify Premium Family', 'Up to 6 Premium accounts for family members living together.', '🎵', 'headcount', 6),
('Spotify Premium Student', 'Special discount for eligible students in university.', '🎵', 'headcount', 2),
('Spotify Premium Platinum', 'The ultimate Spotify experience with HiFi and AI tools.', '🎵', 'headcount', 3),

-- Prime Video
('Prime Video Monthly', 'Enjoy Amazon Prime benefits for one month.', '📦', 'headcount', 5),
('Prime Video Quarterly', '3 months of Amazon Prime benefits.', '📦', 'headcount', 5),
('Prime Video Annual', 'Best value! 12 months of Amazon Prime benefits.', '📦', 'headcount', 5),

-- Jio Hotstar
('Jio Hotstar Super', 'Watch on TV or Mobile, in 1080p Full HD resolution.', '🏏', 'headcount', 2),
('Jio Hotstar Premium', 'Watch on TV or Mobile, in 4K resolution with 4 devices.', '🏏', 'headcount', 4)

ON CONFLICT (name) DO UPDATE 
SET 
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    pool_mode = EXCLUDED.pool_mode,
    max_members = EXCLUDED.max_members;