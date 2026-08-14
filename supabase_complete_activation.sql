-- ============================================================================
-- SAVIFY COMPLETE ACTIVATION — Single Idempotent Migration
-- Run this ONCE in Supabase SQL Editor to activate everything
-- Safe to re-run (all guards in place)
-- ============================================================================

-- ============================================================================
-- 1. GROUP_CARTS EXTENSIONS (pool_name, expires_at, location, fees)
-- ============================================================================
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS pool_name TEXT DEFAULT 'Blinkit Pool';
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 25;
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 5;

-- ============================================================================
-- 2. PLATFORM COLUMN ON PRODUCTS & GROUP_CARTS
-- ============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'blinkit';
ALTER TABLE group_carts ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'blinkit';

-- ============================================================================
-- 3. PUSH_SUBSCRIPTIONS TABLE
-- ============================================================================
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
-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_platform ON products (platform);
CREATE INDEX IF NOT EXISTS idx_group_carts_platform ON group_carts (platform);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);

-- ============================================================================
-- 5. RLS POLICIES (with DROP IF EXISTS guards)
-- ============================================================================

-- Push subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Products public read
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);

-- Push subscriptions realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. UPDATE EXISTING PRODUCTS TO BLINKIT
-- ============================================================================
UPDATE products SET platform = 'blinkit' WHERE platform IS NULL;

-- ============================================================================
-- 7. SEED: ZEPTO (35 products)
-- ============================================================================
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  ('Amul Toned Milk 500ml',28,NULL,'Dairy',true,'zepto'),
  ('Amul Taaza Milk 1L',54,NULL,'Dairy',true,'zepto'),
  ('Mother Dairy Curd 400g',40,NULL,'Dairy',true,'zepto'),
  ('Amul Butter 100g',56,NULL,'Dairy',true,'zepto'),
  ('Amul Masti Buttermilk 200ml',15,NULL,'Dairy',true,'zepto'),
  ('Britannia Cheese Slices 100g',75,NULL,'Dairy',true,'zepto'),
  ('Lays Classic Salted 52g',20,NULL,'Snacks',true,'zepto'),
  ('Kurkure Masala Munch 90g',20,NULL,'Snacks',true,'zepto'),
  ('Haldiram Aloo Bhujia 200g',65,NULL,'Snacks',true,'zepto'),
  ('Parle-G Gold Biscuits 100g',25,NULL,'Snacks',true,'zepto'),
  ('Britannia Good Day Cashew 75g',30,NULL,'Snacks',true,'zepto'),
  ('Too Yumm Multigrain Chips 55g',25,NULL,'Snacks',true,'zepto'),
  ('Coca-Cola 750ml',40,NULL,'Beverages',true,'zepto'),
  ('Thums Up 750ml',40,NULL,'Beverages',true,'zepto'),
  ('Paper Boat Aam Panna 200ml',30,NULL,'Beverages',true,'zepto'),
  ('Real Fruit Power Mixed Fruit 1L',99,NULL,'Beverages',true,'zepto'),
  ('Bisleri Water 1L',20,NULL,'Beverages',true,'zepto'),
  ('Red Bull Energy Drink 250ml',115,NULL,'Beverages',true,'zepto'),
  ('Fresh Banana 1 Dozen',45,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Tomato 500g',20,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Onion 1kg',35,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Potato 1kg',30,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Green Capsicum 250g',22,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Shimla Apple 500g',90,NULL,'Fruits & Vegetables',true,'zepto'),
  ('Colgate MaxFresh 80g',79,NULL,'Personal Care',true,'zepto'),
  ('Dove Shampoo 180ml',155,NULL,'Personal Care',true,'zepto'),
  ('Nivea Body Lotion 200ml',195,NULL,'Personal Care',true,'zepto'),
  ('Dettol Soap 75g',38,NULL,'Personal Care',true,'zepto'),
  ('Gillette Guard Razor',55,NULL,'Personal Care',true,'zepto'),
  ('Surf Excel Easy Wash 1kg',215,NULL,'Household',true,'zepto'),
  ('Vim Liquid 500ml',99,NULL,'Household',true,'zepto'),
  ('Harpic Power Plus 500ml',89,NULL,'Household',true,'zepto'),
  ('Lizol Floor Cleaner 500ml',119,NULL,'Household',true,'zepto'),
  ('Scotch-Brite Scrub Pad 3pc',45,NULL,'Household',true,'zepto'),
  ('Garbage Bags Medium 30pcs',79,NULL,'Household',true,'zepto')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SEED: SWIGGY INSTAMART (35 products)
-- ============================================================================
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  ('Amul Gold Milk 500ml',30,NULL,'Dairy',true,'swiggy_instamart'),
  ('Amul Taaza Toned Milk 1L',56,NULL,'Dairy',true,'swiggy_instamart'),
  ('Nestle a+ Curd 400g',45,NULL,'Dairy',true,'swiggy_instamart'),
  ('Amul Butter 200g',105,NULL,'Dairy',true,'swiggy_instamart'),
  ('Amul Lassi Mango 200ml',25,NULL,'Dairy',true,'swiggy_instamart'),
  ('Go Cheese Slice 200g',120,NULL,'Dairy',true,'swiggy_instamart'),
  ('Lays Magic Masala 52g',20,NULL,'Snacks',true,'swiggy_instamart'),
  ('Kurkure Chilli Chatka 90g',20,NULL,'Snacks',true,'swiggy_instamart'),
  ('Haldiram Namkeen Mix 200g',60,NULL,'Snacks',true,'swiggy_instamart'),
  ('Parle Monaco 100g',25,NULL,'Snacks',true,'swiggy_instamart'),
  ('Oreo Original 120g',30,NULL,'Snacks',true,'swiggy_instamart'),
  ('Bingo Mad Angles 72g',20,NULL,'Snacks',true,'swiggy_instamart'),
  ('Pepsi 750ml',40,NULL,'Beverages',true,'swiggy_instamart'),
  ('Sprite 750ml',40,NULL,'Beverages',true,'swiggy_instamart'),
  ('Tropicana Orange Juice 1L',110,NULL,'Beverages',true,'swiggy_instamart'),
  ('Sting Energy Drink 250ml',20,NULL,'Beverages',true,'swiggy_instamart'),
  ('Kinley Water 1L',20,NULL,'Beverages',true,'swiggy_instamart'),
  ('Paper Boat Jaljeera 200ml',30,NULL,'Beverages',true,'swiggy_instamart'),
  ('Banana Robusta 1 Dozen',40,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Tomato Hybrid 500g',22,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Onion Red 1kg',38,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Potato Fresh 1kg',28,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Cucumber 500g',18,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Watermelon 1pc',55,NULL,'Fruits & Vegetables',true,'swiggy_instamart'),
  ('Pepsodent Toothpaste 100g',65,NULL,'Personal Care',true,'swiggy_instamart'),
  ('Head & Shoulders Shampoo 180ml',185,NULL,'Personal Care',true,'swiggy_instamart'),
  ('Vaseline Body Lotion 200ml',165,NULL,'Personal Care',true,'swiggy_instamart'),
  ('Lifebuoy Soap 100g',36,NULL,'Personal Care',true,'swiggy_instamart'),
  ('Park Avenue Deo 150ml',175,NULL,'Personal Care',true,'swiggy_instamart'),
  ('Tide Plus Detergent 1kg',199,NULL,'Household',true,'swiggy_instamart'),
  ('Pril Dish Wash Gel 500ml',109,NULL,'Household',true,'swiggy_instamart'),
  ('Domex Toilet Cleaner 500ml',85,NULL,'Household',true,'swiggy_instamart'),
  ('Colin Glass Cleaner 500ml',89,NULL,'Household',true,'swiggy_instamart'),
  ('Cello Dustpan with Brush',99,NULL,'Household',true,'swiggy_instamart'),
  ('Hit Mosquito Spray 200ml',145,NULL,'Household',true,'swiggy_instamart')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. SEED: AMAZON FRESH (35 products)
-- ============================================================================
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  ('Amul Full Cream Milk 1L',68,NULL,'Dairy',true,'amazon_fresh'),
  ('Epigamia Greek Yogurt 90g',45,NULL,'Dairy',true,'amazon_fresh'),
  ('Amul Cheese Block 200g',110,NULL,'Dairy',true,'amazon_fresh'),
  ('Nestle Milkmaid 400g',149,NULL,'Dairy',true,'amazon_fresh'),
  ('Amul Paneer 200g',85,NULL,'Dairy',true,'amazon_fresh'),
  ('Lays American Style Cream & Onion 90g',40,NULL,'Snacks',true,'amazon_fresh'),
  ('Cadbury Oreo 300g Family Pack',85,NULL,'Snacks',true,'amazon_fresh'),
  ('Haldiram Soan Papdi 500g',149,NULL,'Snacks',true,'amazon_fresh'),
  ('McVities Digestive 250g',115,NULL,'Snacks',true,'amazon_fresh'),
  ('Britannia NutriChoice Oats 150g',55,NULL,'Snacks',true,'amazon_fresh'),
  ('Coca-Cola Zero 750ml',45,NULL,'Beverages',true,'amazon_fresh'),
  ('Tata Tea Gold 500g',265,NULL,'Beverages',true,'amazon_fresh'),
  ('Nescafe Classic 50g',175,NULL,'Beverages',true,'amazon_fresh'),
  ('Raw Pressery Orange Juice 1L',175,NULL,'Beverages',true,'amazon_fresh'),
  ('Bisleri Water 5L',55,NULL,'Beverages',true,'amazon_fresh'),
  ('Organic Banana 6pc',55,NULL,'Fruits & Vegetables',true,'amazon_fresh'),
  ('Cherry Tomato 200g',45,NULL,'Fruits & Vegetables',true,'amazon_fresh'),
  ('Baby Spinach 100g',40,NULL,'Fruits & Vegetables',true,'amazon_fresh'),
  ('Avocado 1pc',99,NULL,'Fruits & Vegetables',true,'amazon_fresh'),
  ('Broccoli 250g',55,NULL,'Fruits & Vegetables',true,'amazon_fresh'),
  ('Nivea Men Face Wash 100ml',199,NULL,'Personal Care',true,'amazon_fresh'),
  ('Dove Shampoo 340ml',299,NULL,'Personal Care',true,'amazon_fresh'),
  ('Sensodyne Toothpaste 70g',135,NULL,'Personal Care',true,'amazon_fresh'),
  ('Himalaya Face Wash 150ml',175,NULL,'Personal Care',true,'amazon_fresh'),
  ('Philips Trimmer Blade Refill',399,NULL,'Personal Care',true,'amazon_fresh'),
  ('Ariel Matic Top Load 2kg',449,NULL,'Household',true,'amazon_fresh'),
  ('Finish Dishwasher Tabs 30pc',599,NULL,'Household',true,'amazon_fresh'),
  ('Godrej Aer Spray 240ml',199,NULL,'Household',true,'amazon_fresh'),
  ('Cif Cream Cleaner 500ml',179,NULL,'Household',true,'amazon_fresh'),
  ('Borosil Lunch Box Set',549,NULL,'Household',true,'amazon_fresh'),
  ('Fortune Sunflower Oil 1L',145,NULL,'Pantry Staples',true,'amazon_fresh'),
  ('India Gate Basmati Rice 5kg',435,NULL,'Pantry Staples',true,'amazon_fresh'),
  ('Tata Salt 1kg',28,NULL,'Pantry Staples',true,'amazon_fresh'),
  ('Aashirvaad Atta 5kg',295,NULL,'Pantry Staples',true,'amazon_fresh'),
  ('MDH Garam Masala 100g',85,NULL,'Pantry Staples',true,'amazon_fresh')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. SEED: SWIGGY FOOD (30 dishes)
-- ============================================================================
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  ('Chicken Biryani',249,NULL,'Biryani',true,'swiggy_food'),
  ('Mutton Biryani',349,NULL,'Biryani',true,'swiggy_food'),
  ('Veg Biryani',179,NULL,'Biryani',true,'swiggy_food'),
  ('Egg Biryani',199,NULL,'Biryani',true,'swiggy_food'),
  ('Paneer Biryani',219,NULL,'Biryani',true,'swiggy_food'),
  ('Paneer Butter Masala',199,NULL,'North Indian',true,'swiggy_food'),
  ('Dal Tadka',149,NULL,'North Indian',true,'swiggy_food'),
  ('Butter Naan (2pc)',69,NULL,'North Indian',true,'swiggy_food'),
  ('Chole Bhature',129,NULL,'North Indian',true,'swiggy_food'),
  ('Rajma Chawal',139,NULL,'North Indian',true,'swiggy_food'),
  ('Masala Dosa',89,NULL,'South Indian',true,'swiggy_food'),
  ('Idli Sambar (4pc)',69,NULL,'South Indian',true,'swiggy_food'),
  ('Medu Vada (2pc)',59,NULL,'South Indian',true,'swiggy_food'),
  ('Uttapam Onion',79,NULL,'South Indian',true,'swiggy_food'),
  ('Rava Dosa',99,NULL,'South Indian',true,'swiggy_food'),
  ('Veg Fried Rice',149,NULL,'Chinese',true,'swiggy_food'),
  ('Chicken Manchurian',189,NULL,'Chinese',true,'swiggy_food'),
  ('Veg Noodles',139,NULL,'Chinese',true,'swiggy_food'),
  ('Chilli Paneer',179,NULL,'Chinese',true,'swiggy_food'),
  ('Spring Roll (4pc)',119,NULL,'Chinese',true,'swiggy_food'),
  ('Margherita Pizza',199,NULL,'Pizza & Burgers',true,'swiggy_food'),
  ('Chicken Burger',129,NULL,'Pizza & Burgers',true,'swiggy_food'),
  ('Paneer Tikka Pizza',249,NULL,'Pizza & Burgers',true,'swiggy_food'),
  ('French Fries Regular',99,NULL,'Pizza & Burgers',true,'swiggy_food'),
  ('Veg Whopper',149,NULL,'Pizza & Burgers',true,'swiggy_food'),
  ('Gulab Jamun (2pc)',79,NULL,'Desserts',true,'swiggy_food'),
  ('Chocolate Brownie',99,NULL,'Desserts',true,'swiggy_food'),
  ('Rasmalai (2pc)',89,NULL,'Desserts',true,'swiggy_food'),
  ('Ice Cream Sundae',119,NULL,'Desserts',true,'swiggy_food'),
  ('Kulfi Stick',49,NULL,'Desserts',true,'swiggy_food')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. SEED: ZOMATO FOOD (30 dishes)
-- ============================================================================
INSERT INTO products (name, price, image_url, category, in_stock, platform) VALUES
  ('Hyderabadi Dum Biryani',279,NULL,'Biryani',true,'zomato_food'),
  ('Lucknowi Mutton Biryani',379,NULL,'Biryani',true,'zomato_food'),
  ('Veg Dum Biryani',189,NULL,'Biryani',true,'zomato_food'),
  ('Egg Bhuna Biryani',209,NULL,'Biryani',true,'zomato_food'),
  ('Mushroom Biryani',199,NULL,'Biryani',true,'zomato_food'),
  ('Butter Chicken',259,NULL,'North Indian',true,'zomato_food'),
  ('Dal Makhani',179,NULL,'North Indian',true,'zomato_food'),
  ('Garlic Naan (2pc)',79,NULL,'North Indian',true,'zomato_food'),
  ('Aloo Paratha (2pc)',109,NULL,'North Indian',true,'zomato_food'),
  ('Kadhai Paneer',219,NULL,'North Indian',true,'zomato_food'),
  ('Ghee Roast Dosa',109,NULL,'South Indian',true,'zomato_food'),
  ('Mini Idli with Chutney (8pc)',79,NULL,'South Indian',true,'zomato_food'),
  ('Podi Dosa',89,NULL,'South Indian',true,'zomato_food'),
  ('Mysore Masala Dosa',119,NULL,'South Indian',true,'zomato_food'),
  ('Filter Coffee',49,NULL,'South Indian',true,'zomato_food'),
  ('Hakka Noodles',139,NULL,'Chinese',true,'zomato_food'),
  ('Schezwan Fried Rice',159,NULL,'Chinese',true,'zomato_food'),
  ('Dragon Chicken',229,NULL,'Chinese',true,'zomato_food'),
  ('Paneer 65',189,NULL,'Chinese',true,'zomato_food'),
  ('Momos Steamed (6pc)',99,NULL,'Chinese',true,'zomato_food'),
  ('Farmhouse Pizza',249,NULL,'Pizza & Burgers',true,'zomato_food'),
  ('Classic Chicken Burger',139,NULL,'Pizza & Burgers',true,'zomato_food'),
  ('Tandoori Paneer Pizza',269,NULL,'Pizza & Burgers',true,'zomato_food'),
  ('Loaded Fries',129,NULL,'Pizza & Burgers',true,'zomato_food'),
  ('Aloo Tikki Burger',109,NULL,'Pizza & Burgers',true,'zomato_food'),
  ('Rabdi Gulab Jamun',99,NULL,'Desserts',true,'zomato_food'),
  ('Death by Chocolate Pastry',129,NULL,'Desserts',true,'zomato_food'),
  ('Phirni',79,NULL,'Desserts',true,'zomato_food'),
  ('Shahi Tukda',109,NULL,'Desserts',true,'zomato_food'),
  ('Mango Lassi',69,NULL,'Desserts',true,'zomato_food')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. POOL TYPES: Add Quick Commerce & Food Delivery Pools
-- ============================================================================
INSERT INTO pool_types (name, emoji, description, slot_duration_hours, pool_mode, max_members) VALUES
  ('Zepto Pool', '⚡', '10-min grocery delivery shared cart', 4, 'timeslot', NULL),
  ('Swiggy Instamart Pool', '🛒', 'Instant grocery delivery shared cart', 4, 'timeslot', NULL),
  ('Amazon Now Pool', '📦', 'Fast delivery shared cart', 4, 'timeslot', NULL),
  ('Swiggy Food Pool', '🍔', 'Order food together and save on delivery', 4, 'timeslot', NULL),
  ('Zomato Pool', '🍕', 'Group food ordering for discounts', 4, 'timeslot', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 13. GENERATE TODAY'S TIME SLOTS FOR ALL TIMESLOT POOLS
-- ============================================================================
INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, s.slot_start, s.slot_end
FROM pool_types pt
CROSS JOIN (VALUES
  ('12:00 AM', '4:00 AM'),
  ('4:00 AM',  '8:00 AM'),
  ('8:00 AM',  '12:00 PM'),
  ('12:00 PM', '4:00 PM'),
  ('4:00 PM',  '8:00 PM'),
  ('8:00 PM',  '12:00 AM')
) AS s(slot_start, slot_end)
WHERE pt.pool_mode = 'timeslot'
ON CONFLICT DO NOTHING;

-- Generate "All Day" slots for headcount pools
INSERT INTO pool_slots (pool_type_id, slot_date, slot_start, slot_end)
SELECT pt.id, CURRENT_DATE, 'All Day', ''
FROM pool_types pt
WHERE pt.pool_mode = 'headcount'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. VERIFICATION (uncomment to check)
-- ============================================================================
-- SELECT platform, COUNT(*) FROM products GROUP BY platform ORDER BY platform;
-- SELECT name, pool_mode FROM pool_types ORDER BY name;
-- SELECT * FROM push_subscriptions LIMIT 5;
