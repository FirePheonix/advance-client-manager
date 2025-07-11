-- Insert sample clients with different payment structures (CORRECTED - Services Only)
INSERT INTO clients (id, name, email, phone, company, company_address, gst_number, poc_phone, payment_type, monthly_rate, weekly_rate, next_payment, status, services, per_post_rates, tiered_payments, final_monthly_rate, final_weekly_rate, final_services, notes) VALUES
-- Tiered Payment Client 1: TechStart Inc. - Example: Month 1-6: ₹75k, Month 7-12: ₹135k, After: ₹195k
('550e8400-e29b-41d4-a716-446655440001', 'TechStart Inc.', 'contact@techstart.com', '+91 98765 43210', 'TechStart Inc.', 'Tech Park, Bangalore, Karnataka 560001', '29ABCDE1234F1Z5', '+91 98765 43211', 'monthly', NULL, NULL, '2024-02-01', 'active', '{}', '{}', '[
  {"amount": 0, "duration_months": 6, "payment_type": "monthly", "services": {"LinkedIn": 40000, "Twitter": 35000}}, 
  {"amount": 0, "duration_months": 6, "payment_type": "monthly", "services": {"LinkedIn": 50000, "Twitter": 40000, "Instagram": 45000}}
]', NULL, NULL, '{"LinkedIn": 60000, "Twitter": 45000, "Instagram": 50000, "YouTube": 40000}', 'Tech startup: Tier 1 (₹75k) → Tier 2 (₹135k) → Final (₹195k)'),

-- Per-post Client: Fashion Forward - only per-post rates
('550e8400-e29b-41d4-a716-446655440002', 'Fashion Forward', 'hello@fashionforward.com', '+91 87654 32109', 'Fashion Forward Ltd.', 'Fashion Street, Mumbai, Maharashtra 400001', '27FGHIJ5678K2L9', '+91 87654 32110', 'per-post', NULL, NULL, NULL, 'active', '{}', '{"Instagram Post": 75, "Facebook Post": 50, "YouTube Video": 200, "Story Design": 100}', '[]', NULL, NULL, '{}', 'Fashion brand - pure per-post pricing'),

-- Tiered Payment Client 2: Local Restaurant - Example: Month 1-3: ₹27k, Month 4-9: ₹43k, After: ₹50k
('550e8400-e29b-41d4-a716-446655440003', 'Local Restaurant', 'owner@localrestaurant.com', '+91 76543 21098', 'Local Restaurant', 'Food Street, Delhi 110001', NULL, '+91 76543 21099', 'weekly', NULL, NULL, '2024-01-29', 'active', '{}', '{}', '[
  {"amount": 0, "duration_months": 3, "payment_type": "weekly", "services": {"Facebook": 15000, "Instagram": 12000}}, 
  {"amount": 0, "duration_months": 6, "payment_type": "weekly", "services": {"Facebook": 18000, "Instagram": 15000, "YouTube": 10000}}
]', NULL, NULL, '{"Facebook": 20000, "Instagram": 18000, "YouTube": 12000}', 'Restaurant: Tier 1 (₹27k) → Tier 2 (₹43k) → Final (₹50k)'),

-- Normal Payment Client 1: E-commerce Store - services only (no base rate)
('550e8400-e29b-41d4-a716-446655440004', 'E-commerce Store', 'admin@ecommerce.com', '+91 65432 10987', 'E-commerce Store Pvt Ltd', 'IT Hub, Hyderabad, Telangana 500001', '36MNOPQ9012R3S6', '+91 65432 10988', 'monthly', NULL, NULL, '2024-02-01', 'active', '{"Instagram": 40000, "Facebook": 35000, "Twitter": 45000}', '{}', '[]', NULL, NULL, '{}', 'E-commerce with services only, payment = sum of services'),

-- Normal Payment Client 2: Digital Agency - services only (no base rate)
('550e8400-e29b-41d4-a716-446655440005', 'Digital Agency', 'contact@digitalagency.com', '+91 54321 09876', 'Digital Agency Co.', 'Business Park, Pune, Maharashtra 411001', '27TUVWX3456Y7Z8', '+91 54321 09877', 'monthly', NULL, NULL, '2024-02-01', 'active', '{"LinkedIn": 30000, "Twitter": 25000, "YouTube": 45000}', '{}', '[]', NULL, NULL, '{}', 'B2B agency with services only, payment = sum of services'),

-- Normal Weekly Payment Client: Fitness Studio - services only (no base rate)
('550e8400-e29b-41d4-a716-446655440006', 'Fitness Studio', 'info@fitnessstudio.com', '+91 43210 98765', 'Fitness Studio Ltd.', 'Health Street, Chennai, Tamil Nadu 600001', '33DEFGH6789I0J1', '+91 43210 98766', 'weekly', NULL, NULL, '2024-01-29', 'active', '{"Instagram": 12000, "Facebook": 8000, "YouTube": 5000}', '{}', '[]', NULL, NULL, '{}', 'Fitness studio with services only, payment = sum of services');

-- Insert sample team members
INSERT INTO team_members (id, name, role, email, phone, salary, payment_date, status) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Sarah Johnson', 'Content Creator', 'sarah@agency.com', '+91 98765 11111', 35000.00, '1st of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440002', 'Mike Chen', 'Graphic Designer', 'mike@agency.com', '+91 98765 22222', 40000.00, '5th of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440003', 'Emma Rodriguez', 'Social Media Intern', 'emma@agency.com', '+91 98765 33333', 15000.00, '15th of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440004', 'Alex Kumar', 'Video Editor', 'alex@agency.com', '+91 98765 44444', 38000.00, '1st of every month', 'active'),
('660e8400-e29b-41d4-a716-446655440005', 'Priya Sharma', 'Account Manager', 'priya@agency.com', '+91 98765 55555', 45000.00, '5th of every month', 'active');

-- Insert sample payments (revenue timeline data) - updated to reflect services-only pricing
INSERT INTO payments (client_id, amount, payment_date, status, description, type) VALUES
-- January 2024 (amounts = sum of services only)
('550e8400-e29b-41d4-a716-446655440001', 75000.00, '2024-01-01', 'completed', 'Tiered services payment (LinkedIn: ₹40k + Twitter: ₹35k)', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-01-01', 'completed', 'Tiered services payment (Facebook: ₹15k + Instagram: ₹12k)', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 120000.00, '2024-01-01', 'completed', 'Services payment (Instagram: ₹40k + Facebook: ₹35k + Twitter: ₹45k)', 'payment'),
('550e8400-e29b-41d4-a716-446655440006', 25000.00, '2024-01-01', 'completed', 'Services payment (Instagram: ₹12k + Facebook: ₹8k + YouTube: ₹5k)', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 75000.00, '2024-01-05', 'completed', 'Per-post payments - various posts', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-01-08', 'completed', 'Tiered services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 100000.00, '2024-01-10', 'completed', 'Services payment (LinkedIn: ₹30k + Twitter: ₹25k + YouTube: ₹45k)', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 25000.00, '2024-01-12', 'completed', 'Additional services only', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-01-15', 'completed', 'Tiered services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 85000.00, '2024-01-18', 'completed', 'Per-post payments - premium content', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 60000.00, '2024-01-20', 'completed', 'Additional campaign services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-01-22', 'completed', 'Tiered services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 95000.00, '2024-01-25', 'completed', 'Additional project services', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 30000.00, '2024-01-28', 'completed', 'Additional services only', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-01-29', 'completed', 'Tiered services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440006', 25000.00, '2024-01-29', 'completed', 'Services payment', 'payment'),

-- February 2024 (amounts = sum of services only)
('550e8400-e29b-41d4-a716-446655440001', 75000.00, '2024-02-01', 'completed', 'Tiered services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 120000.00, '2024-02-01', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 90000.00, '2024-02-03', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-02-05', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 100000.00, '2024-02-08', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 35000.00, '2024-02-10', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-02-12', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 75000.00, '2024-02-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 65000.00, '2024-02-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-02-19', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 85000.00, '2024-02-22', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 40000.00, '2024-02-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-02-26', 'completed', 'Services payment', 'payment'),

-- March 2024 (amounts = sum of services only)
('550e8400-e29b-41d4-a716-446655440001', 75000.00, '2024-03-01', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 120000.00, '2024-03-01', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 95000.00, '2024-03-05', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-03-05', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 100000.00, '2024-03-08', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 45000.00, '2024-03-12', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-03-12', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 80000.00, '2024-03-15', 'completed', 'Additional campaign', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 70000.00, '2024-03-18', 'completed', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-03-19', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 90000.00, '2024-03-22', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440001', 50000.00, '2024-03-25', 'completed', 'Additional services', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-03-26', 'completed', 'Services payment', 'payment'),

-- April 2024 (some pending/overdue - amounts = sum of services only)
('550e8400-e29b-41d4-a716-446655440001', 75000.00, '2024-04-01', 'pending', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440004', 120000.00, '2024-04-01', 'overdue', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440002', 80000.00, '2024-04-05', 'pending', 'Per-post payments', 'payment'),
('550e8400-e29b-41d4-a716-446655440003', 27000.00, '2024-04-05', 'completed', 'Services payment', 'payment'),
('550e8400-e29b-41d4-a716-446655440005', 100000.00, '2024-04-08', 'pending', 'Services payment', 'payment');

-- Insert sample tasks
INSERT INTO tasks (client_id, title, description, priority, platform, start_date, end_date, assignees, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'LinkedIn Campaign Setup', 'Create and configure LinkedIn advertising campaign for Q1', 'high', 'LinkedIn', '2024-01-15', '2024-01-30', '{"Sarah Johnson", "Mike Chen"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440001', 'Instagram Content Creation', 'Design 10 Instagram posts for product launch', 'medium', 'Instagram', '2024-01-10', '2024-01-25', '{"Emma Rodriguez"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440002', 'Fashion Week Campaign', 'Create Instagram stories for fashion week coverage', 'high', 'Instagram', '2024-01-20', '2024-02-05', '{"Alex Kumar"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440002', 'YouTube Fashion Haul', 'Produce and edit fashion haul video content', 'medium', 'YouTube', '2024-01-15', '2024-01-30', '{"Alex Kumar", "Sarah Johnson"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440003', 'Daily Specials Posts', 'Create daily food specials for Facebook and Instagram', 'medium', 'Facebook', '2024-01-01', '2024-01-31', '{"Mike Chen"}', 'in-progress'),
('550e8400-e29b-41d4-a716-446655440004', 'Product Launch Campaign', 'Multi-platform campaign for new product line', 'high', 'Instagram', '2024-01-25', '2024-02-15', '{"Emma Rodriguez", "Alex Kumar"}', 'todo'),
('550e8400-e29b-41d4-a716-446655440005', 'B2B LinkedIn Strategy', 'Develop comprehensive LinkedIn B2B content strategy', 'high', 'LinkedIn', '2024-01-10', '2024-02-10', '{"Sarah Johnson"}', 'review');
