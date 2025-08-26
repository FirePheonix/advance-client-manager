-- Settings table for business information
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Business Information
  business_name TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  pan_number TEXT NOT NULL DEFAULT 'QXMPS9195B',
  business_address TEXT NOT NULL DEFAULT '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001',
  business_email TEXT,
  business_phone TEXT,
  
  -- Bank Information
  bank_name TEXT NOT NULL DEFAULT 'HDFC Bank LTD',
  branch_name TEXT NOT NULL DEFAULT 'Raipur GE Road',
  account_holder TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  account_number TEXT NOT NULL DEFAULT '50100613672509',
  ifsc_code TEXT NOT NULL DEFAULT 'HDFC0000769',
  branch_address TEXT NOT NULL DEFAULT 'GE ROAD, OPP CSEB OFFICE, RAIPUR CHATTISGARH 492010',
  
  -- UPI Information
  upi_id TEXT NOT NULL DEFAULT '7241113205@upi',
  
  -- Invoice Defaults
  default_currency_symbol TEXT NOT NULL DEFAULT '₹',
  default_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  default_payment_terms TEXT,
  default_thank_you_message TEXT,
  default_payment_instructions TEXT,
  default_terms_conditions TEXT,
  
  -- Created/Updated timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Create updated_at trigger
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

