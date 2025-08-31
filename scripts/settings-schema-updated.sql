-- Updated Settings table for comprehensive invoice form fields
-- Drop existing settings table if it exists
DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Business Information (FROM section)
  fromName TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  fromAddress TEXT NOT NULL DEFAULT '403, Maruti Kunj, Mohaba bazaar, opposite Sinapore City, Raipur, Chhattisgarh- 492001',
  fromPhone TEXT NOT NULL DEFAULT '9915474100',
  fromEmail TEXT NOT NULL DEFAULT 'sawadiajanavi@gmail.com',
  
  -- Bank Information
  bankAccountName TEXT NOT NULL DEFAULT 'Janavi Sawadia',
  bankAccountNumber TEXT NOT NULL DEFAULT '50100613672509',
  bankIFSC TEXT NOT NULL DEFAULT 'HDFC0000769',
  
  -- UPI Information
  upiId TEXT NOT NULL DEFAULT '7241113205@upi',
  upiPhone TEXT NOT NULL DEFAULT '9915474100',
  contactEmail TEXT NOT NULL DEFAULT 'sawadiajanavi@gmail.com',
  
  -- Invoice Details
  invoiceNumber TEXT,
  invoiceDate TEXT,
  businessTitle TEXT NOT NULL DEFAULT 'INVOICE',
  businessSubtitle TEXT,
  
  -- Messages & Content
  thankYouMessage TEXT NOT NULL DEFAULT 'Thank you for your business!',
  paymentInstructions TEXT NOT NULL DEFAULT 'Please make payment using the bank details or UPI ID provided above.',
  termsAndConditions TEXT NOT NULL DEFAULT 'Payment is due within 15 days of invoice date. Late payments may incur additional charges.',
  footerText TEXT,
  
  -- Financial Details
  currencySymbol TEXT NOT NULL DEFAULT '₹',
  taxRate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discountReason TEXT,
  notes TEXT,
  
  -- Media URLs
  logoUrl TEXT,
  signatureUrl TEXT,
  
  -- Custom Fields
  customField1 TEXT,
  customField2 TEXT,
  customField3 TEXT,
  customField4 TEXT,
  customField5 TEXT,
  
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


