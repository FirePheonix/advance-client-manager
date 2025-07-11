-- Migration script to update clients table for tiered payments and service pricing
-- Run this AFTER the updated schema has been applied

-- Step 1: Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS poc_phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tiered_payments JSONB DEFAULT '[]';

-- Step 2: Update status enum to include 'archived'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check CHECK (status IN ('active', 'inactive', 'pending', 'archived'));

-- Step 3: Migrate existing services from TEXT[] to JSONB
-- First, let's temporarily rename the column
ALTER TABLE clients RENAME COLUMN services TO services_old;

-- Add new services column with JSONB type
ALTER TABLE clients ADD COLUMN services JSONB DEFAULT '{}';

-- Update services data (convert array to object with 0 prices)
UPDATE clients SET services = (
  SELECT jsonb_object_agg(service_name, 0)
  FROM (
    SELECT unnest(services_old) AS service_name
    WHERE services_old IS NOT NULL
  ) AS services_data
) WHERE services_old IS NOT NULL AND array_length(services_old, 1) > 0;

-- Set empty object for null/empty arrays
UPDATE clients SET services = '{}' WHERE services_old IS NULL OR array_length(services_old, 1) = 0;

-- Drop the old column
ALTER TABLE clients DROP COLUMN services_old;

-- Step 4: Update payment_type enum to include 'weekly'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_payment_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_payment_type_check CHECK (payment_type IN ('monthly', 'weekly', 'per-post'));

-- Step 5: Add weekly_rate column (if not exists)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS weekly_rate DECIMAL(10,2);

-- Step 6: Update indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_address ON clients(company_address);
CREATE INDEX IF NOT EXISTS idx_clients_gst_number ON clients(gst_number);
CREATE INDEX IF NOT EXISTS idx_clients_services ON clients USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_clients_tiered_payments ON clients USING GIN(tiered_payments);

-- Step 7: Sample data update (optional - update existing clients with new structure)
-- This is just an example - you might want to set proper values based on your needs

-- Example: Set some sample tiered payments for existing clients
UPDATE clients SET tiered_payments = '[
  {"amount": 25000, "duration_months": 3, "payment_type": "monthly"},
  {"amount": 35000, "duration_months": 6, "payment_type": "monthly"}
]' WHERE payment_type = 'monthly' AND tiered_payments = '[]';

-- Example: Convert existing service arrays to service-price objects (if you have specific services)
-- This is a more complex migration that depends on your current data structure

COMMIT;

DELETE FROM payments;
DELETE FROM tasks;
DELETE FROM clients;
DELETE FROM team_members;
DELETE FROM other_expenses;
