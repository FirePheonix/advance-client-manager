-- Insert sample clients
INSERT INTO clients (id, name, email, phone, company, payment_type, monthly_rate, weekly_rate, next_payment, status, services, per_post_rates, notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'TechStart Inc.', 'contact@techstart.com', '+91 98765 43210', 'TechStart Inc.', 'monthly', 200000.00, NULL, '2024-02-01', 'active', '{"LinkedIn", "Twitter", "Instagram"}', '{}', 'Tech startup focused on AI solutions'),
('550e8400-e29b-41d4-a716-446655440002', 'Fashion Forward', 'hello@fashionforward.com', '+91 87654 32109', 'Fashion Forward Ltd.', 'per-post', NULL, NULL, NULL, 'active', '{"Instagram", "Facebook", "YouTube"}', '{"Instagram Post": 75, "Facebook Post": 50, "YouTube Video": 200, "Story Design": 100}', 'Fashion and lifestyle brand'),
('550e8400-e29b-41d4-a716-446655440003', 'Local Restaurant', 'owner@localrestaurant.com', '+91 76543 21098', 'Local Restaurant', 'weekly', NULL, 48000.00, '2024-01-29', 'active', '{"Facebook", "Instagram"}', '{}', 'Family-owned restaurant chain'),
('550e8400-e29b-41d4-a716-446655440004', 'E-commerce Store', 'admin@ecommerce.com', '+91 65432 10987', 'E-commerce Store Pvt Ltd', 'monthly', 144000.00, NULL, '2024-02-01', 'active', '{"Instagram", "Facebook", "Twitter"}', '{}', 'Online retail platform'),
('550e8400-e29b-41d4-a716-446655440005', 'Digital Agency', 'contact@digitalagency.com', '+91 54321 09876', 'Digital Agency Co.', 'per-post', NULL, NULL, NULL, 'active', '{"LinkedIn", "Twitter", "YouTube"}', '{"LinkedIn Post": 60, "Twitter Post": 40, "YouTube Video": 250}', 'B2B digital marketing agency');

-- Insert sample team members
INSERT INTO team_members (id, name, role, email, phone, salary, payment_date, status) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Sarah Johnson', 'Content Creator', 'sarah@agency.com', '+91 98765 11111', 35000.00, '1st of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440002', 'Mike Chen', 'Graphic Designer', 'mike@agency.com', '+91 98765 22222', 40000.00, '5th of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440003', 'Emma Rodriguez', 'Social Media Intern', 'emma@agency.com', '+91 98765 33333', 15000.00, '15th of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440004', 'Alex Kumar', 'Video Editor', 'alex@agency.com', '+91 98765 44444', 38000.00, '1st of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440005', 'Priya Sharma', 'Account Manager', 'priya@agency.com', '+91 98765 55555', 45000.00, '5th of every month', 'active');

-- Insert sample payments (revenue timeline data)
INSERT INTO payments (client_id, amount, payment_date, status, description, type) VALUES
-- January 2024
('550e8400-e29b-41d4-a716-446655440001', 200000.00, '2024-01-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-01-01', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 144000.00, '2024-01-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 75000.00, '2024-01-05', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-01-08', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 120000.00, '2024-01-10', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 25000.00, '2024-01-12', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-01-15', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 85000.00, '2024-01-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 60000.00, '2024-01-20', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-01-22', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 95000.00, '2024-01-25', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 30000.00, '2024-01-28', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-01-29', 'completed', 'Weekly payment', 'payment'),

-- February 2024
('550e8400-e29b-41d4-a716-446655440001', 200000.00, '2024-02-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 144000.00, '2024-02-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 90000.00, '2024-02-03', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-02-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 110000.00, '2024-02-08', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 35000.00, '2024-02-10', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-02-12', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 75000.00, '2024-02-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 65000.00, '2024-02-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-02-19', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 85000.00, '2024-02-22', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 40000.00, '2024-02-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-02-26', 'completed', 'Weekly payment', 'payment'),

-- March 2024
('550e8400-e29b-41d4-a716-446655440001', 200000.00, '2024-03-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 144000.00, '2024-03-01', 'completed', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 95000.00, '2024-03-05', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-03-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 125000.00, '2024-03-08', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 45000.00, '2024-03-12', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-03-12', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 80000.00, '2024-03-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 70000.00, '2024-03-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-03-19', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 90000.00, '2024-03-22', 'completed', 'Project payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 50000.00, '2024-03-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-03-26', 'completed', 'Weekly payment', 'payment'),

-- April 2024 (some pending/overdue)
('550e8400-e29b-41d4-a716-446655440001', 200000.00, '2024-04-01', 'pending', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 144000.00, '2024-04-01', 'overdue', 'Monthly retainer payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 80000.00, '2024-04-05', 'pending', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 48000.00, '2024-04-05', 'completed', 'Weekly payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 130000.00, '2024-04-08', 'pending', 'Project payment', 'payment');

-- Insert sample tasks
INSERT INTO tasks (client_id, title, description, priority, platform, start_date, end_date, assignees, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'LinkedIn Campaign Setup', 'Create and configure LinkedIn advertising campaign for Q1', 'high', 'LinkedIn', '2024-01-15', '2024-01-30', '{"Sarah Johnson", "Mike Chen"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440001', 'Instagram Content Creation', 'Design 10 Instagram posts for product launch', 'medium', 'Instagram', '2024-01-10', '2024-01-25', '{"Emma Rodriguez"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440002', 'Fashion Week Campaign', 'Create Instagram stories for fashion week coverage', 'high', 'Instagram', '2024-01-20', '2024-02-05', '{"Alex Kumar"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440002', 'YouTube Fashion Haul', 'Produce and edit fashion haul video content', 'medium', 'YouTube', '2024-01-15', '2024-01-30', '{"Alex Kumar", "Sarah Johnson"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440003', 'Daily Specials Posts', 'Create daily food specials for Facebook and Instagram', 'medium', 'Facebook', '2024-01-01', '2024-01-31', '{"Mike Chen"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440004', 'Product Launch Campaign', 'Multi-platform campaign for new product line', 'high', 'Instagram', '2024-01-25', '2024-02-15', '{"Emma Rodriguez", "Alex Kumar"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440005', 'B2B LinkedIn Strategy', 'Develop comprehensive LinkedIn B2B content strategy', 'high', 'LinkedIn', '2024-01-10', '2024-02-10', '{"Sarah Johnson"}', 'review');
