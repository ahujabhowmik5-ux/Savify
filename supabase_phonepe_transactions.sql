-- PhonePe Transactions Table
CREATE TABLE IF NOT EXISTS phonepe_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    merchant_transaction_id TEXT NOT NULL UNIQUE,
    phonepe_transaction_id TEXT,
    context_type TEXT NOT NULL, -- 'cart' (Blinkit) or 'pool' (Netflix/Spotify)
    context_id TEXT NOT NULL, -- ID of the group_cart or pool_slot
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE phonepe_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own transactions (when initiating)
CREATE POLICY "Users can insert their own transactions" 
ON phonepe_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own transactions
CREATE POLICY "Users can view their own transactions" 
ON phonepe_transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admin to read all transactions
-- We use the same hack/logic used elsewhere: if we are querying from service role, it bypasses RLS anyway.
-- So we just need policies for authenticated users.

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_phonepe_transactions_modtime ON phonepe_transactions;

CREATE TRIGGER update_phonepe_transactions_modtime 
BEFORE UPDATE ON phonepe_transactions 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
