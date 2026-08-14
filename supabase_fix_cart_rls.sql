-- ============================================================
-- FIX: Allow all authenticated users to READ cart_items and cart_payments
-- This is needed so the Admin Panel can see all order items
-- (cart items are not sensitive — they're shared pool data)
-- ============================================================

-- 1. Drop any restrictive SELECT policies on cart_items
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can view cart items" ON cart_items;
DROP POLICY IF EXISTS "Allow read cart_items" ON cart_items;
DROP POLICY IF EXISTS "cart_items_select" ON cart_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON cart_items;

-- 2. Create a permissive SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can read all cart items"
ON cart_items
FOR SELECT
TO authenticated
USING (true);

-- 3. Same for cart_payments (admin needs to see payment records)
DROP POLICY IF EXISTS "Users can view their own payments" ON cart_payments;
DROP POLICY IF EXISTS "Users can view cart payments" ON cart_payments;
DROP POLICY IF EXISTS "Allow read cart_payments" ON cart_payments;
DROP POLICY IF EXISTS "cart_payments_select" ON cart_payments;
DROP POLICY IF EXISTS "Enable read access for all users" ON cart_payments;

CREATE POLICY "Authenticated users can read all cart payments"
ON cart_payments
FOR SELECT
TO authenticated
USING (true);

-- 4. Ensure INSERT/UPDATE policies still exist for cart_items
-- (users should only modify their own items)
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
CREATE POLICY "Users can insert their own cart items"
ON cart_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
CREATE POLICY "Users can update their own cart items"
ON cart_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;
CREATE POLICY "Users can delete their own cart items"
ON cart_items
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 5. Ensure RLS is enabled on both tables
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_payments ENABLE ROW LEVEL SECURITY;
