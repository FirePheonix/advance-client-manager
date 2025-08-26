-- IMPORTANT: Run this in your Supabase SQL Editor

-- Step 1: Backup current settings (optional)
-- If you want to keep any existing settings, uncomment the next line first:
-- CREATE TABLE settings_backup AS SELECT * FROM settings;

-- Step 2: Apply the new simplified schema
-- Drop existing settings table if it exists
DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Business Information (FROM section)
  from_name TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  from_address TEXT NOT NULL DEFAULT '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001',
  from_phone TEXT NOT NULL DEFAULT '9915474100',
  from_email TEXT NOT NULL DEFAULT 'sawadiajanavi@gmail.com',
  
  -- Bank Information
  bank_account_name TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  bank_account_number TEXT NOT NULL DEFAULT '50100613672509',
  bank_ifsc TEXT NOT NULL DEFAULT 'HDFC0000769',
  
  -- UPI Information
  upi_id TEXT NOT NULL DEFAULT '7241113205@upi',
  upi_phone TEXT NOT NULL DEFAULT '9915474100',
  contact_email TEXT NOT NULL DEFAULT 'sawadiajanavi@gmail.com',
  
  -- Created/Updated timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Insert default settings
INSERT INTO settings (from_name, from_address, from_phone, from_email, bank_account_name, bank_account_number, bank_ifsc, upi_id, upi_phone, contact_email) 
VALUES ('Janavi Sawadia', '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001', '9915474100', 'sawadiajanavi@gmail.com', 'Janavi Sawadia', '50100613672509', 'HDFC0000769', '7241113205@upi', '9915474100', 'sawadiajanavi@gmail.com');

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Verify the setup
SELECT * FROM settings;
