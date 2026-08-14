-- Migration: Add 30-minute pool fields to group_carts
ALTER TABLE group_carts 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS latitude FLOAT,
ADD COLUMN IF NOT EXISTS longitude FLOAT,
ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 5;

-- Migration: Update status constraint (if one existed, though currently it's just TEXT)
-- The allowed statuses will now be: 'open', 'checkout_pending', 'ordered', 'done', 'cancelled'
