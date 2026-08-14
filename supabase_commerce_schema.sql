-- ═══════════════════════════════════════════════════════════
-- SAVIFY COMMERCE & SHARED CART SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Products (Synced daily via local script)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price INTEGER NOT NULL, -- price in INR
    image_url TEXT,
    category TEXT,
    in_stock BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- 2. Group Carts (The shared session)
CREATE TABLE IF NOT EXISTS group_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID REFERENCES new_halls(id) ON DELETE CASCADE,  -- nullable, optional
    creator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    time_slot TEXT NOT NULL DEFAULT '12 PM - 4 PM',
    status TEXT DEFAULT 'open', -- 'open', 'ordered', 'done'
    total_amount INTEGER DEFAULT 0,
    target_amount INTEGER DEFAULT 199,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES group_carts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    price_at_time INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    added_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Cart Payments (Tracking who paid the platform fee + their share)
CREATE TABLE IF NOT EXISTS cart_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES group_carts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount_paid INTEGER NOT NULL, -- Item share + Commission
    commission_fee INTEGER DEFAULT 5, -- ₹5 fee
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
    paid_at TIMESTAMPTZ
);

-- RLS & Realtime
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_payments ENABLE ROW LEVEL SECURITY;

-- Note: We disable RLS on products to let local scraper update it easily
DROP POLICY IF EXISTS "Auth can modify products" ON products;
CREATE POLICY "Anyone can modify products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);

CREATE POLICY "Anyone can read group_carts" ON group_carts FOR SELECT USING (true);
CREATE POLICY "Auth can create group_carts" ON group_carts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth can update group_carts" ON group_carts FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can read cart_items" ON cart_items FOR SELECT USING (true);
CREATE POLICY "Auth can insert cart_items" ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart_items" ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart_items" ON cart_items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read cart_payments" ON cart_payments FOR SELECT USING (true);
CREATE POLICY "Auth can insert cart_payments" ON cart_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE group_carts;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE cart_payments;

-- If you are updating an existing database, run these ALTER statements:
-- ALTER TABLE group_carts ADD COLUMN time_slot TEXT DEFAULT '12 PM - 4 PM';
-- ALTER TABLE cart_items ADD COLUMN payment_status TEXT DEFAULT 'pending';
