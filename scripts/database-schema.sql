-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company TEXT,
  payment_type TEXT CHECK (payment_type IN ('monthly', 'weekly', 'per-post')) NOT NULL,
  monthly_rate DECIMAL(10,2),
  weekly_rate DECIMAL(10,2),
  next_payment DATE,
  status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  services TEXT[] DEFAULT '{}',
  per_post_rates JSONB DEFAULT '{}',
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

-- Add these to your database-schema.sql file

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
    COALESCE(SUM(CASE WHEN status = ''completed'' THEN amount ELSE 0 END), 0) as completed_revenue,
    COALESCE(SUM(CASE WHEN status = ''pending'' THEN amount ELSE 0 END), 0) as pending_revenue,
    COALESCE(SUM(CASE WHEN status = ''overdue'' THEN amount ELSE 0 END), 0) as overdue_revenue,
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