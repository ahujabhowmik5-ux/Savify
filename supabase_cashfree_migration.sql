-- ══════════════════════════════════════════════════════════════
-- Cashfree Payment Gateway Migration
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Add cashfree_order_id column to existing phonepe_transactions table
-- This column stores the Cashfree order ID for each transaction
ALTER TABLE phonepe_transactions 
ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT;

-- Create index on cashfree_order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_phonepe_transactions_cashfree_order_id 
ON phonepe_transactions(cashfree_order_id);

-- Also create index on merchant_transaction_id if it doesn't exist
-- (used for webhook + status check lookups)
CREATE INDEX IF NOT EXISTS idx_phonepe_transactions_merchant_txn_id 
ON phonepe_transactions(merchant_transaction_id);

-- Allow service role to UPDATE transactions (for webhook fulfillment)
-- Note: Service role bypasses RLS by default, but if you need
-- an explicit policy for edge cases:
CREATE POLICY "Service role can update transactions" 
ON phonepe_transactions FOR UPDATE 
USING (true) 
WITH CHECK (true);
