-- ===================================================================
-- COMPLETE DATABASE SETUP & SEEDING SCRIPT FOR SUPABASE
-- Copy and paste this entire script into Supabase SQL Editor
-- This script will create all tables AND insert sample data
-- ===================================================================

-- ===================================================================
-- STEP 1: CREATE ALL TABLES (SCHEMA)
-- ===================================================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company TEXT,
  company_address TEXT,
  gst_number TEXT,
  poc_phone TEXT,
  payment_type TEXT CHECK (payment_type IN ('monthly', 'weekly', 'per-post')) NOT NULL,
  monthly_rate DECIMAL(10,2),
  weekly_rate DECIMAL(10,2),
  next_payment DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'pending', 'archived')) DEFAULT 'active',
  services JSONB DEFAULT '{}', -- Service -> price mapping for normal payment clients
  per_post_rates JSONB DEFAULT '{}',
  tiered_payments JSONB DEFAULT '[]', -- Array of tiered payment objects (each with services)
  final_monthly_rate DECIMAL(10,2), -- Final rate after tiers complete
  final_weekly_rate DECIMAL(10,2), -- Final rate after tiers complete  
  final_services JSONB DEFAULT '{}', -- Final services after tiers complete
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT CHECK (status IN ('completed', 'pending', 'overdue')) DEFAULT 'pending',
  description TEXT,
  type TEXT CHECK (type IN ('payment', 'post', 'reminder')) DEFAULT 'payment',
  post_count INTEGER DEFAULT 0,
  platform_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  platform TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  assignees TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('todo', 'in-progress', 'review', 'completed')) DEFAULT 'todo',
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  salary DECIMAL(10,2) NOT NULL,
  payment_date TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create other_expenses table
CREATE TABLE IF NOT EXISTS other_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_payment_type ON clients(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_other_expenses_date ON other_expenses(date);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - you can restrict later)
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on other_expenses" ON other_expenses FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get payments grouped by time period
CREATE OR REPLACE FUNCTION get_payments_by_time_period(date_trunc text, limit_count integer)
RETURNS TABLE (
  period text,
  total_amount numeric,
  completed_amount numeric,
  pending_amount numeric,
  overdue_amount numeric
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      to_char(date_trunc(%L, payment_date), ''YYYY-MM-DD'') as period,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN status = ''completed'' THEN amount ELSE 0 END), 0) as completed_amount,
      COALESCE(SUM(CASE WHEN status = ''pending'' THEN amount ELSE 0 END), 0) as pending_amount,
      COALESCE(SUM(CASE WHEN status = ''overdue'' THEN amount ELSE 0 END), 0) as overdue_amount
    FROM payments
    GROUP BY period
    ORDER BY period DESC
    LIMIT %s
  ', date_trunc, limit_count);
END;
$$ LANGUAGE plpgsql;

-- Function to get payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats()
RETURNS TABLE (
  total_revenue numeric,
  completed_revenue numeric,
  pending_revenue numeric,
  overdue_revenue numeric,
  avg_payment numeric,
  payment_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_revenue,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_revenue,
    COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as overdue_revenue,
    COALESCE(AVG(amount), 0) as avg_payment,
    COUNT(*) as payment_count
  FROM payments;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue trends
CREATE OR REPLACE FUNCTION get_revenue_trends(period_type text)
RETURNS TABLE (
  current_period text,
  current_amount numeric,
  previous_period text,
  previous_amount numeric,
  percentage_change numeric
) AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    WITH current_data AS (
      SELECT 
        to_char(date_trunc(%L, payment_date), ''YYYY-MM-DD'') as period,
        SUM(amount) as amount
      FROM payments
      WHERE status = ''completed''
        AND date_trunc(%L, payment_date) = date_trunc(%L, CURRENT_DATE)
      GROUP BY period
    ),
    previous_data AS (
      SELECT 
        to_char(date_trunc(%L, payment_date), ''YYYY-MM-DD'') as period,
        SUM(amount) as amount
      FROM payments
      WHERE status = ''completed''
        AND date_trunc(%L, payment_date) = date_trunc(%L, CURRENT_DATE - INTERVAL ''1 %s'')
      GROUP BY period
    )
    SELECT 
      c.period as current_period,
      COALESCE(c.amount, 0) as current_amount,
      p.period as previous_period,
      COALESCE(p.amount, 0) as previous_amount,
      CASE 
        WHEN COALESCE(p.amount, 0) = 0 THEN 0
        ELSE (COALESCE(c.amount, 0) - COALESCE(p.amount, 0)) / COALESCE(p.amount, 0) * 100
      END as percentage_change
    FROM current_data c
    CROSS JOIN previous_data p
  ', period_type, period_type, period_type, period_type, period_type, period_type, period_type);
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- STEP 2: INSERT SAMPLE DATA
-- ===================================================================

-- Clear existing data (uncomment if you want to reset)
-- DELETE FROM tasks;
-- DELETE FROM payments;
-- DELETE FROM other_expenses;
-- DELETE FROM team_members;
-- DELETE FROM clients;

-- ===================================================================
-- INSERT SAMPLE CLIENTS WITH NEW STRUCTURE
-- ===================================================================

INSERT INTO clients (
  id, name, email, phone, company, company_address, gst_number, poc_phone, 
  payment_type, monthly_rate, weekly_rate, next_payment, status, 
  services, per_post_rates, tiered_payments, notes
) VALUES
-- TechStart Inc. - Monthly client with tiered payments and services
(
  '550e8400-e29b-41d4-a716-446655440001',
  'TechStart Inc.',
  'contact@techstart.com',
  '+91 98765 43210',
  'TechStart Inc.',
  'Tech Park, Bangalore, Karnataka 560001',
  '29ABCDE1234F1Z5',
  '+91 98765 43211',
  'monthly',
  150000.00,
  NULL,
  '2025-08-01',
  'active',
  '{"LinkedIn": 50000, "Twitter": 40000, "Instagram": 60000}',
  '{}',
  '[{"amount": 50000, "duration_months": 6, "payment_type": "monthly"}, {"amount": 75000, "duration_months": 12, "payment_type": "monthly"}]',
  'Tech startup focused on AI solutions'
),

-- Fashion Forward - Per-post client with individual service pricing
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Fashion Forward',
  'hello@fashionforward.com',
  '+91 87654 32109',
  'Fashion Forward Ltd.',
  'Fashion Street, Mumbai, Maharashtra 400001',
  '27FGHIJ5678K2L9',
  '+91 87654 32110',
  'per-post',
  NULL,
  NULL,
  NULL,
  'active',
  '{"Instagram": 35000, "Facebook": 25000, "YouTube": 40000}',
  '{"Instagram Post": 75, "Facebook Post": 50, "YouTube Video": 200, "Story Design": 100}',
  '[]',
  'Fashion and lifestyle brand'
),

-- Local Restaurant - Weekly client with tiered payments
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Local Restaurant',
  'owner@localrestaurant.com',
  '+91 76543 21098',
  'Local Restaurant',
  'Food Street, Delhi 110001',
  NULL,
  '+91 76543 21099',
  'weekly',
  NULL,
  36000.00,
  '2025-07-14',
  'active',
  '{"Facebook": 18000, "Instagram": 18000}',
  '{}',
  '[{"amount": 12000, "duration_months": 3, "payment_type": "weekly"}, {"amount": 15000, "duration_months": 6, "payment_type": "weekly"}]',
  'Family-owned restaurant chain'
),

-- E-commerce Store - Monthly client with simple tiered payment
(
  '550e8400-e29b-41d4-a716-446655440004',
  'E-commerce Store',
  'admin@ecommerce.com',
  '+91 65432 10987',
  'E-commerce Store Pvt Ltd',
  'IT Hub, Hyderabad, Telangana 500001',
  '36MNOPQ9012R3S6',
  '+91 65432 10988',
  'monthly',
  120000.00,
  NULL,
  '2025-08-01',
  'active',
  '{"Instagram": 40000, "Facebook": 35000, "Twitter": 45000}',
  '{}',
  '[{"amount": 24000, "duration_months": 4, "payment_type": "monthly"}]',
  'Online retail platform'
),

-- Digital Agency - Per-post B2B client
(
  '550e8400-e29b-41d4-a716-446655440005',
  'Digital Agency',
  'contact@digitalagency.com',
  '+91 54321 09876',
  'Digital Agency Co.',
  'Business Park, Pune, Maharashtra 411001',
  '27TUVWX3456Y7Z8',
  '+91 54321 09877',
  'per-post',
  NULL,
  NULL,
  NULL,
  'active',
  '{"LinkedIn": 30000, "Twitter": 25000, "YouTube": 45000}',
  '{"LinkedIn Post": 60, "Twitter Post": 40, "YouTube Video": 250}',
  '[]',
  'B2B digital marketing agency'
),

-- Archived Client Example
(
  '550e8400-e29b-41d4-a716-446655440006',
  'Archived Client',
  'archived@example.com',
  '+91 99999 99999',
  'Archived Company',
  'Old Address, City 123456',
  '12ARCHIVE123Z1',
  '+91 99999 99998',
  'monthly',
  50000.00,
  NULL,
  '2125-01-01',
  'archived',
  '{"Twitter": 25000, "Facebook": 25000}',
  '{}',
  '[]',
  'This client has been archived'
);

-- ===================================================================
-- INSERT SAMPLE TEAM MEMBERS
-- ===================================================================

INSERT INTO team_members (
  id, name, role, email, phone, salary, payment_date, status
) VALUES
(
  '660e8400-e29b-41d4-a716-446655440001',
  'Sarah Johnson',
  'Content Creator',
  'sarah@agency.com',
  '+91 98765 11111',
  35000.00,
  '1st of every month',
  'active'
),
(
  '660e8400-e29b-41d4-a716-446655440002',
  'Mike Chen',
  'Graphic Designer',
  'mike@agency.com',
  '+91 98765 22222',
  40000.00,
  '5th of every month',
  'active'
),
(
  '660e8400-e29b-41d4-a716-446655440003',
  'Emma Rodriguez',
  'Social Media Intern',
  'emma@agency.com',
  '+91 98765 33333',
  15000.00,
  '15th of every month',
  'active'
),
(
  '660e8400-e29b-41d4-a716-446655440004',
  'Alex Kumar',
  'Video Editor',
  'alex@agency.com',
  '+91 98765 44444',
  38000.00,
  '1st of every month',
  'active'
),
(
  '660e8400-e29b-41d4-a716-446655440005',
  'Priya Sharma',
  'Account Manager',
  'priya@agency.com',
  '+91 98765 55555',
  45000.00,
  '5th of every month',
  'active'
);

-- ===================================================================
-- INSERT SAMPLE PAYMENTS (HISTORICAL DATA)
-- ===================================================================

INSERT INTO payments (client_id, amount, payment_date, status, description, type) VALUES

-- January 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-01-01', 'completed', 'Monthly retainer + services (₹150k base + ₹50k tier + ₹150k services)', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-01-01', 'completed', 'Weekly payment (₹36k base + ₹12k tier)', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-01-01', 'completed', 'Monthly retainer + services (₹120k base + ₹24k tier + ₹120k services)', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 75000.00, '2025-01-05', 'completed', 'Per-post payments + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-01-08', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 120000.00, '2025-01-10', 'completed', 'Project payment + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 25000.00, '2025-01-12', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-01-15', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 85000.00, '2025-01-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 60000.00, '2025-01-20', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-01-22', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 95000.00, '2025-01-25', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 30000.00, '2025-01-28', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-01-29', 'completed', 'Weekly payment', 'payment'),

-- February 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-02-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-02-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 90000.00, '2025-02-03', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-02-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 110000.00, '2025-02-08', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 35000.00, '2025-02-10', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-02-12', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 75000.00, '2025-02-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 65000.00, '2025-02-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-02-19', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 85000.00, '2025-02-22', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 40000.00, '2025-02-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-02-26', 'completed', 'Weekly payment', 'payment'),

-- March 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-03-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-03-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 95000.00, '2025-03-05', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-03-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 125000.00, '2025-03-08', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 45000.00, '2025-03-12', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-03-12', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 80000.00, '2025-03-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 70000.00, '2025-03-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-03-19', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 90000.00, '2025-03-22', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 50000.00, '2025-03-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-03-26', 'completed', 'Weekly payment', 'payment'),

-- April 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-04-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-04-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 80000.00, '2025-04-05', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-04-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 130000.00, '2025-04-08', 'completed', 'Project payment', 'payment'),

-- May 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-05-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-05-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 85000.00, '2025-05-05', 'completed', 'Per-post payments', 'payment'),

-- June 2025 Payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-06-01', 'completed', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-06-01', 'completed', 'Monthly retainer + services', 'payment'),

-- July 2025 Payments (Current Month - some pending/overdue)
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-07-01', 'pending', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-07-01', 'overdue', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 80000.00, '2025-07-05', 'pending', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2025-07-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 130000.00, '2025-07-08', 'pending', 'Project payment', 'payment'),

-- Upcoming payments
('550e8400-e29b-41d4-a716-446655440001', 260000.00, '2025-08-01', 'pending', 'Monthly retainer + services', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 264000.00, '2025-08-01', 'pending', 'Monthly retainer + services', 'payment');

-- ===================================================================
-- INSERT SAMPLE TASKS
-- ===================================================================

INSERT INTO tasks (
  client_id, title, description, priority, platform, 
  start_date, end_date, assignees, status, comments_count
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  'LinkedIn Campaign Setup',
  'Create and configure LinkedIn advertising campaign for Q3 2025',
  'high',
  'LinkedIn',
  '2025-07-15',
  '2025-07-30',
  '{"Sarah Johnson", "Mike Chen"}',
  'todo',
  0
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Instagram Content Creation',
  'Design 10 Instagram posts for product launch',
  'medium',
  'Instagram',
  '2025-07-10',
  '2025-07-25',
  '{"Emma Rodriguez"}',
  'in-progress',
  2
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Fashion Week Campaign',
  'Create Instagram stories for fashion week coverage',
  'high',
  'Instagram',
  '2025-07-20',
  '2025-08-05',
  '{"Alex Kumar"}',
  'todo',
  0
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'YouTube Fashion Haul',
  'Produce and edit fashion haul video content',
  'medium',
  'YouTube',
  '2025-07-15',
  '2025-07-30',
  '{"Alex Kumar", "Sarah Johnson"}',
  'in-progress',
  1
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Daily Specials Posts',
  'Create daily food specials for Facebook and Instagram',
  'medium',
  'Facebook',
  '2025-07-01',
  '2025-07-31',
  '{"Mike Chen"}',
  'in-progress',
  3
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Product Launch Campaign',
  'Multi-platform campaign for new product line',
  'high',
  'Instagram',
  '2025-07-25',
  '2025-08-15',
  '{"Emma Rodriguez", "Alex Kumar"}',
  'todo',
  0
),
(
  '550e8400-e29b-41d4-a716-446655440005',
  'B2B LinkedIn Strategy',
  'Develop comprehensive LinkedIn B2B content strategy',
  'high',
  'LinkedIn',
  '2025-07-10',
  '2025-08-10',
  '{"Sarah Johnson"}',
  'review',
  4
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Twitter Campaign Optimization',
  'Optimize existing Twitter campaigns for better engagement',
  'medium',
  'Twitter',
  '2025-07-08',
  '2025-07-22',
  '{"Sarah Johnson", "Priya Sharma"}',
  'completed',
  1
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Weekend Special Promotions',
  'Create weekend promotion posts for restaurant',
  'low',
  'Instagram',
  '2025-07-12',
  '2025-07-14',
  '{"Emma Rodriguez"}',
  'completed',
  0
);

-- ===================================================================
-- INSERT SAMPLE OTHER EXPENSES
-- ===================================================================

INSERT INTO other_expenses (title, amount, date, description) VALUES
('Office Rent', 25000.00, '2025-01-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-01-01', 'Adobe Creative Suite, Canva Pro, social media tools'),
('Marketing Tools', 8000.00, '2025-01-01', 'Social media management and analytics tools'),
('Internet & Phone', 3000.00, '2025-01-01', 'Monthly internet and phone bills'),
('Equipment Purchase', 50000.00, '2025-01-15', 'New laptops and cameras for team'),
('Office Rent', 25000.00, '2025-02-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-02-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-02-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-02-01', 'Monthly internet and phone bills'),
('Team Training', 12000.00, '2025-02-15', 'Social media marketing training for team'),
('Office Rent', 25000.00, '2025-03-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-03-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-03-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-03-01', 'Monthly internet and phone bills'),
('Client Meeting Expenses', 5000.00, '2025-03-10', 'Travel and meeting expenses for client presentations'),
('Office Rent', 25000.00, '2025-04-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-04-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-04-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-04-01', 'Monthly internet and phone bills'),
('Office Rent', 25000.00, '2025-05-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-05-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-05-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-05-01', 'Monthly internet and phone bills'),
('Conference Attendance', 20000.00, '2025-05-15', 'Social media marketing conference'),
('Office Rent', 25000.00, '2025-06-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-06-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-06-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-06-01', 'Monthly internet and phone bills'),
('Office Rent', 25000.00, '2025-07-01', 'Monthly office space rental'),
('Software Subscriptions', 15000.00, '2025-07-01', 'Monthly software subscriptions'),
('Marketing Tools', 8000.00, '2025-07-01', 'Social media management tools'),
('Internet & Phone', 3000.00, '2025-07-01', 'Monthly internet and phone bills');

-- ===================================================================
-- VERIFICATION QUERIES (Optional - run to verify data)
-- ===================================================================

-- Uncomment these queries to verify your data was inserted correctly:

-- SELECT 'Clients' as table_name, COUNT(*) as count FROM clients
-- UNION ALL
-- SELECT 'Team Members', COUNT(*) FROM team_members
-- UNION ALL  
-- SELECT 'Payments', COUNT(*) FROM payments
-- UNION ALL
-- SELECT 'Tasks', COUNT(*) FROM tasks
-- UNION ALL
-- SELECT 'Other Expenses', COUNT(*) FROM other_expenses;

-- SELECT 
--   c.name,
--   c.payment_type,
--   c.services,
--   c.tiered_payments,
--   COUNT(p.id) as payment_count,
--   SUM(p.amount) as total_revenue
-- FROM clients c
-- LEFT JOIN payments p ON c.id = p.client_id
-- WHERE c.status = 'active'
-- GROUP BY c.id, c.name, c.payment_type, c.services, c.tiered_payments
-- ORDER BY total_revenue DESC;

-- ===================================================================
-- SEEDING COMPLETE!
-- ===================================================================

-- Summary of seeded data:
-- ✅ 6 Clients (5 active, 1 archived)
--    - Includes tiered payments, service-based pricing, and all new fields
--    - Examples of monthly, weekly, and per-post payment types
-- ✅ 5 Team Members (all active)
-- ✅ 50+ Payments (historical data from Jan-July 2025)
-- ✅ 9 Tasks (various statuses and priorities)
-- ✅ 30+ Other Expenses (monthly recurring expenses)

-- Your database is now ready with comprehensive sample data!
-- You can start testing the new tiered payment and service pricing features.
