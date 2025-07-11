-- Create post_counts table to track the number of posts for per-post clients
CREATE TABLE IF NOT EXISTS post_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: YYYY-MM to track counts by month
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each client has only one record per platform per month
  UNIQUE(client_id, platform, month_year)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_counts_client_id ON post_counts(client_id);
CREATE INDEX IF NOT EXISTS idx_post_counts_month_year ON post_counts(month_year);

-- Enable Row Level Security
ALTER TABLE post_counts ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on post_counts" ON post_counts FOR ALL USING (true);

-- Add fixed_payment_day column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fixed_payment_day INTEGER;
