-- ============================================================================
-- Savify Multi-Platform Migration
-- Generated: 2026-07-05
-- Description: Adds multi-platform support, push subscriptions, PostGIS
--              spatial queries, RLS policies, and seeds product catalogs
--              for Blinkit, Zepto, Swiggy Instamart, Amazon Fresh,
--              Swiggy Food, and Zomato Food.
-- ============================================================================

-- ============================================================================
-- 1. SCHEMA CHANGES
-- ============================================================================

-- 1a. Add platform column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'blinkit';

-- 1b. Add platform column to group_carts table
ALTER TABLE group_carts
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'blinkit';

-- 1c. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  latitude    FLOAT,
  longitude   FLOAT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. POSTGIS EXTENSION & SPATIAL SUPPORT
-- ============================================================================

-- 2a. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2b. Add geometry column to group_carts for spatial queries
-- (Point geometry in SRID 4326 — WGS84 lat/lng)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'group_carts' AND column_name = 'location'
  ) THEN
    ALTER TABLE group_carts
      ADD COLUMN location geometry(Point, 4326);
  END IF;
END $$;

-- 2c. Create spatial index on group_carts.location
CREATE INDEX IF NOT EXISTS idx_group_carts_location
  ON group_carts USING GIST (location);

-- ============================================================================
-- 3. INDEXES FOR PLATFORM LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_platform
  ON products (platform);

CREATE INDEX IF NOT EXISTS idx_group_carts_platform
  ON group_carts (platform);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

-- ============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 4a. push_subscriptions — users can only read/write their own
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- 4b. products — everyone can read
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (true);

-- ============================================================================
-- 5. SEED DATA
-- ============================================================================

-- 5a. Update existing products to 'blinkit' platform
UPDATE products SET platform = 'blinkit' WHERE platform IS NULL;

-- ---------------------------------------------------------------------------
-- 5b. ZEPTO — Quick Commerce (35 products)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  -- Dairy
  ('Amul Toned Milk 500ml',          28,   NULL, 'Dairy',               true, 'zepto'),
  ('Amul Taaza Milk 1L',             54,   NULL, 'Dairy',               true, 'zepto'),
  ('Mother Dairy Curd 400g',         40,   NULL, 'Dairy',               true, 'zepto'),
  ('Amul Butter 100g',               56,   NULL, 'Dairy',               true, 'zepto'),
  ('Amul Masti Buttermilk 200ml',    15,   NULL, 'Dairy',               true, 'zepto'),
  ('Britannia Cheese Slices 100g',   75,   NULL, 'Dairy',               true, 'zepto'),
  -- Snacks
  ('Lays Classic Salted 52g',        20,   NULL, 'Snacks',              true, 'zepto'),
  ('Kurkure Masala Munch 90g',       20,   NULL, 'Snacks',              true, 'zepto'),
  ('Haldiram Aloo Bhujia 200g',      65,   NULL, 'Snacks',              true, 'zepto'),
  ('Parle-G Gold Biscuits 100g',     25,   NULL, 'Snacks',              true, 'zepto'),
  ('Britannia Good Day Cashew 75g',  30,   NULL, 'Snacks',              true, 'zepto'),
  ('Too Yumm Multigrain Chips 55g',  25,   NULL, 'Snacks',              true, 'zepto'),
  -- Beverages
  ('Coca-Cola 750ml',                40,   NULL, 'Beverages',           true, 'zepto'),
  ('Thums Up 750ml',                 40,   NULL, 'Beverages',           true, 'zepto'),
  ('Paper Boat Aam Panna 200ml',     30,   NULL, 'Beverages',           true, 'zepto'),
  ('Real Fruit Power Mixed Fruit 1L',99,   NULL, 'Beverages',           true, 'zepto'),
  ('Bisleri Water 1L',               20,   NULL, 'Beverages',           true, 'zepto'),
  ('Red Bull Energy Drink 250ml',   115,   NULL, 'Beverages',           true, 'zepto'),
  -- Fruits & Vegetables
  ('Fresh Banana 1 Dozen',           45,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  ('Tomato 500g',                    20,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  ('Onion 1kg',                      35,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  ('Potato 1kg',                     30,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  ('Green Capsicum 250g',            22,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  ('Shimla Apple 500g',              90,   NULL, 'Fruits & Vegetables', true, 'zepto'),
  -- Personal Care
  ('Colgate MaxFresh 80g',           79,   NULL, 'Personal Care',       true, 'zepto'),
  ('Dove Shampoo 180ml',            155,   NULL, 'Personal Care',       true, 'zepto'),
  ('Nivea Body Lotion 200ml',       195,   NULL, 'Personal Care',       true, 'zepto'),
  ('Dettol Soap 75g',                38,   NULL, 'Personal Care',       true, 'zepto'),
  ('Gillette Guard Razor',           55,   NULL, 'Personal Care',       true, 'zepto'),
  -- Household
  ('Surf Excel Easy Wash 1kg',      215,   NULL, 'Household',           true, 'zepto'),
  ('Vim Liquid 500ml',               99,   NULL, 'Household',           true, 'zepto'),
  ('Harpic Power Plus 500ml',        89,   NULL, 'Household',           true, 'zepto'),
  ('Lizol Floor Cleaner 500ml',     119,   NULL, 'Household',           true, 'zepto'),
  ('Scotch-Brite Scrub Pad 3pc',     45,   NULL, 'Household',           true, 'zepto'),
  ('Garbage Bags Medium 30pcs',      79,   NULL, 'Household',           true, 'zepto')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5c. SWIGGY INSTAMART — Quick Commerce (35 products)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  -- Dairy
  ('Amul Gold Milk 500ml',           30,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  ('Amul Taaza Toned Milk 1L',       56,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  ('Nestle a+ Curd 400g',            45,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  ('Amul Butter 200g',              105,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  ('Amul Lassi Mango 200ml',         25,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  ('Go Cheese Slice 200g',          120,   NULL, 'Dairy',               true, 'swiggy_instamart'),
  -- Snacks
  ('Lays Magic Masala 52g',          20,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  ('Kurkure Chilli Chatka 90g',      20,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  ('Haldiram Namkeen Mix 200g',      60,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  ('Parle Monaco 100g',              25,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  ('Oreo Original 120g',             30,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  ('Bingo Mad Angles 72g',           20,   NULL, 'Snacks',              true, 'swiggy_instamart'),
  -- Beverages
  ('Pepsi 750ml',                    40,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  ('Sprite 750ml',                   40,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  ('Tropicana Orange Juice 1L',     110,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  ('Sting Energy Drink 250ml',       20,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  ('Kinley Water 1L',                20,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  ('Paper Boat Jaljeera 200ml',      30,   NULL, 'Beverages',           true, 'swiggy_instamart'),
  -- Fruits & Vegetables
  ('Banana Robusta 1 Dozen',         40,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  ('Tomato Hybrid 500g',             22,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  ('Onion Red 1kg',                  38,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  ('Potato Fresh 1kg',               28,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  ('Cucumber 500g',                  18,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  ('Watermelon 1pc',                 55,   NULL, 'Fruits & Vegetables', true, 'swiggy_instamart'),
  -- Personal Care
  ('Pepsodent Toothpaste 100g',      65,   NULL, 'Personal Care',       true, 'swiggy_instamart'),
  ('Head & Shoulders Shampoo 180ml',185,   NULL, 'Personal Care',       true, 'swiggy_instamart'),
  ('Vaseline Body Lotion 200ml',    165,   NULL, 'Personal Care',       true, 'swiggy_instamart'),
  ('Lifebuoy Soap 100g',             36,   NULL, 'Personal Care',       true, 'swiggy_instamart'),
  ('Park Avenue Deo 150ml',         175,   NULL, 'Personal Care',       true, 'swiggy_instamart'),
  -- Household
  ('Tide Plus Detergent 1kg',       199,   NULL, 'Household',           true, 'swiggy_instamart'),
  ('Pril Dish Wash Gel 500ml',      109,   NULL, 'Household',           true, 'swiggy_instamart'),
  ('Domex Toilet Cleaner 500ml',     85,   NULL, 'Household',           true, 'swiggy_instamart'),
  ('Colin Glass Cleaner 500ml',      89,   NULL, 'Household',           true, 'swiggy_instamart'),
  ('Cello Dustpan with Brush',       99,   NULL, 'Household',           true, 'swiggy_instamart'),
  ('Hit Mosquito Spray 200ml',      145,   NULL, 'Household',           true, 'swiggy_instamart')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5d. AMAZON FRESH — Grocery (35 products, slightly premium pricing)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  -- Dairy
  ('Amul Full Cream Milk 1L',        68,   NULL, 'Dairy',               true, 'amazon_fresh'),
  ('Epigamia Greek Yogurt 90g',      45,   NULL, 'Dairy',               true, 'amazon_fresh'),
  ('Amul Cheese Block 200g',        110,   NULL, 'Dairy',               true, 'amazon_fresh'),
  ('Nestle Milkmaid 400g',          149,   NULL, 'Dairy',               true, 'amazon_fresh'),
  ('Amul Paneer 200g',               85,   NULL, 'Dairy',               true, 'amazon_fresh'),
  -- Snacks
  ('Lays American Style Cream & Onion 90g', 40, NULL, 'Snacks',         true, 'amazon_fresh'),
  ('Cadbury Oreo 300g Family Pack', 85,   NULL, 'Snacks',              true, 'amazon_fresh'),
  ('Haldiram Soan Papdi 500g',     149,   NULL, 'Snacks',              true, 'amazon_fresh'),
  ('McVities Digestive 250g',      115,   NULL, 'Snacks',              true, 'amazon_fresh'),
  ('Britannia NutriChoice Oats 150g',55,  NULL, 'Snacks',              true, 'amazon_fresh'),
  -- Beverages
  ('Coca-Cola Zero 750ml',           45,   NULL, 'Beverages',           true, 'amazon_fresh'),
  ('Tata Tea Gold 500g',            265,   NULL, 'Beverages',           true, 'amazon_fresh'),
  ('Nescafe Classic 50g',           175,   NULL, 'Beverages',           true, 'amazon_fresh'),
  ('Raw Pressery Orange Juice 1L',  175,   NULL, 'Beverages',           true, 'amazon_fresh'),
  ('Bisleri Water 5L',               55,   NULL, 'Beverages',           true, 'amazon_fresh'),
  -- Fruits & Vegetables
  ('Organic Banana 6pc',             55,   NULL, 'Fruits & Vegetables', true, 'amazon_fresh'),
  ('Cherry Tomato 200g',             45,   NULL, 'Fruits & Vegetables', true, 'amazon_fresh'),
  ('Baby Spinach 100g',              40,   NULL, 'Fruits & Vegetables', true, 'amazon_fresh'),
  ('Avocado 1pc',                    99,   NULL, 'Fruits & Vegetables', true, 'amazon_fresh'),
  ('Broccoli 250g',                  55,   NULL, 'Fruits & Vegetables', true, 'amazon_fresh'),
  -- Personal Care
  ('Nivea Men Face Wash 100ml',     199,   NULL, 'Personal Care',       true, 'amazon_fresh'),
  ('Dove Shampoo 340ml',            299,   NULL, 'Personal Care',       true, 'amazon_fresh'),
  ('Sensodyne Toothpaste 70g',      135,   NULL, 'Personal Care',       true, 'amazon_fresh'),
  ('Himalaya Face Wash 150ml',      175,   NULL, 'Personal Care',       true, 'amazon_fresh'),
  ('Philips Trimmer Blade Refill',  399,   NULL, 'Personal Care',       true, 'amazon_fresh'),
  -- Household
  ('Ariel Matic Top Load 2kg',      449,   NULL, 'Household',           true, 'amazon_fresh'),
  ('Finish Dishwasher Tabs 30pc',   599,   NULL, 'Household',           true, 'amazon_fresh'),
  ('Godrej Aer Spray 240ml',        199,   NULL, 'Household',           true, 'amazon_fresh'),
  ('Cif Cream Cleaner 500ml',       179,   NULL, 'Household',           true, 'amazon_fresh'),
  ('Borosil Lunch Box Set',         549,   NULL, 'Household',           true, 'amazon_fresh'),
  -- Pantry Staples
  ('Fortune Sunflower Oil 1L',      145,   NULL, 'Pantry Staples',      true, 'amazon_fresh'),
  ('India Gate Basmati Rice 5kg',   435,   NULL, 'Pantry Staples',      true, 'amazon_fresh'),
  ('Tata Salt 1kg',                  28,   NULL, 'Pantry Staples',      true, 'amazon_fresh'),
  ('Aashirvaad Atta 5kg',          295,   NULL, 'Pantry Staples',      true, 'amazon_fresh'),
  ('MDH Garam Masala 100g',          85,   NULL, 'Pantry Staples',      true, 'amazon_fresh')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5e. SWIGGY FOOD — Food Delivery (30 dishes)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  -- Biryani
  ('Chicken Biryani',               249,   NULL, 'Biryani',             true, 'swiggy_food'),
  ('Mutton Biryani',                349,   NULL, 'Biryani',             true, 'swiggy_food'),
  ('Veg Biryani',                   179,   NULL, 'Biryani',             true, 'swiggy_food'),
  ('Egg Biryani',                   199,   NULL, 'Biryani',             true, 'swiggy_food'),
  ('Paneer Biryani',                219,   NULL, 'Biryani',             true, 'swiggy_food'),
  -- North Indian
  ('Paneer Butter Masala',          199,   NULL, 'North Indian',        true, 'swiggy_food'),
  ('Dal Tadka',                     149,   NULL, 'North Indian',        true, 'swiggy_food'),
  ('Butter Naan (2pc)',              69,   NULL, 'North Indian',        true, 'swiggy_food'),
  ('Chole Bhature',                 129,   NULL, 'North Indian',        true, 'swiggy_food'),
  ('Rajma Chawal',                  139,   NULL, 'North Indian',        true, 'swiggy_food'),
  -- South Indian
  ('Masala Dosa',                    89,   NULL, 'South Indian',        true, 'swiggy_food'),
  ('Idli Sambar (4pc)',              69,   NULL, 'South Indian',        true, 'swiggy_food'),
  ('Medu Vada (2pc)',                59,   NULL, 'South Indian',        true, 'swiggy_food'),
  ('Uttapam Onion',                  79,   NULL, 'South Indian',        true, 'swiggy_food'),
  ('Rava Dosa',                      99,   NULL, 'South Indian',        true, 'swiggy_food'),
  -- Chinese
  ('Veg Fried Rice',                149,   NULL, 'Chinese',             true, 'swiggy_food'),
  ('Chicken Manchurian',            189,   NULL, 'Chinese',             true, 'swiggy_food'),
  ('Veg Noodles',                   139,   NULL, 'Chinese',             true, 'swiggy_food'),
  ('Chilli Paneer',                 179,   NULL, 'Chinese',             true, 'swiggy_food'),
  ('Spring Roll (4pc)',             119,   NULL, 'Chinese',             true, 'swiggy_food'),
  -- Pizza & Burgers
  ('Margherita Pizza',              199,   NULL, 'Pizza & Burgers',     true, 'swiggy_food'),
  ('Chicken Burger',                129,   NULL, 'Pizza & Burgers',     true, 'swiggy_food'),
  ('Paneer Tikka Pizza',            249,   NULL, 'Pizza & Burgers',     true, 'swiggy_food'),
  ('French Fries Regular',           99,   NULL, 'Pizza & Burgers',     true, 'swiggy_food'),
  ('Veg Whopper',                   149,   NULL, 'Pizza & Burgers',     true, 'swiggy_food'),
  -- Desserts
  ('Gulab Jamun (2pc)',              79,   NULL, 'Desserts',            true, 'swiggy_food'),
  ('Chocolate Brownie',              99,   NULL, 'Desserts',            true, 'swiggy_food'),
  ('Rasmalai (2pc)',                 89,   NULL, 'Desserts',            true, 'swiggy_food'),
  ('Ice Cream Sundae',             119,   NULL, 'Desserts',            true, 'swiggy_food'),
  ('Kulfi Stick',                    49,   NULL, 'Desserts',            true, 'swiggy_food')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5f. ZOMATO FOOD — Food Delivery (30 dishes)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  -- Biryani
  ('Hyderabadi Dum Biryani',        279,   NULL, 'Biryani',             true, 'zomato_food'),
  ('Lucknowi Mutton Biryani',       379,   NULL, 'Biryani',             true, 'zomato_food'),
  ('Veg Dum Biryani',               189,   NULL, 'Biryani',             true, 'zomato_food'),
  ('Egg Bhuna Biryani',             209,   NULL, 'Biryani',             true, 'zomato_food'),
  ('Mushroom Biryani',              199,   NULL, 'Biryani',             true, 'zomato_food'),
  -- North Indian
  ('Butter Chicken',                259,   NULL, 'North Indian',        true, 'zomato_food'),
  ('Dal Makhani',                   179,   NULL, 'North Indian',        true, 'zomato_food'),
  ('Garlic Naan (2pc)',              79,   NULL, 'North Indian',        true, 'zomato_food'),
  ('Aloo Paratha (2pc)',            109,   NULL, 'North Indian',        true, 'zomato_food'),
  ('Kadhai Paneer',                 219,   NULL, 'North Indian',        true, 'zomato_food'),
  -- South Indian
  ('Ghee Roast Dosa',               109,   NULL, 'South Indian',        true, 'zomato_food'),
  ('Mini Idli with Chutney (8pc)',   79,   NULL, 'South Indian',        true, 'zomato_food'),
  ('Podi Dosa',                      89,   NULL, 'South Indian',        true, 'zomato_food'),
  ('Mysore Masala Dosa',            119,   NULL, 'South Indian',        true, 'zomato_food'),
  ('Filter Coffee',                  49,   NULL, 'South Indian',        true, 'zomato_food'),
  -- Chinese
  ('Hakka Noodles',                 139,   NULL, 'Chinese',             true, 'zomato_food'),
  ('Schezwan Fried Rice',           159,   NULL, 'Chinese',             true, 'zomato_food'),
  ('Dragon Chicken',                229,   NULL, 'Chinese',             true, 'zomato_food'),
  ('Paneer 65',                     189,   NULL, 'Chinese',             true, 'zomato_food'),
  ('Momos Steamed (6pc)',            99,   NULL, 'Chinese',             true, 'zomato_food'),
  -- Pizza & Burgers
  ('Farmhouse Pizza',               249,   NULL, 'Pizza & Burgers',     true, 'zomato_food'),
  ('Classic Chicken Burger',        139,   NULL, 'Pizza & Burgers',     true, 'zomato_food'),
  ('Tandoori Paneer Pizza',         269,   NULL, 'Pizza & Burgers',     true, 'zomato_food'),
  ('Loaded Fries',                  129,   NULL, 'Pizza & Burgers',     true, 'zomato_food'),
  ('Aloo Tikki Burger',             109,   NULL, 'Pizza & Burgers',     true, 'zomato_food'),
  -- Desserts
  ('Rabdi Gulab Jamun',              99,   NULL, 'Desserts',            true, 'zomato_food'),
  ('Death by Chocolate Pastry',     129,   NULL, 'Desserts',            true, 'zomato_food'),
  ('Phirni',                         79,   NULL, 'Desserts',            true, 'zomato_food'),
  ('Shahi Tukda',                   109,   NULL, 'Desserts',            true, 'zomato_food'),
  ('Mango Lassi',                    69,   NULL, 'Desserts',            true, 'zomato_food')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. VERIFICATION QUERIES (run manually to confirm)
-- ============================================================================
-- SELECT platform, COUNT(*) FROM products GROUP BY platform ORDER BY platform;
-- SELECT * FROM push_subscriptions LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'group_carts';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'group_carts';
