-- Test script to simulate and fix your specific tier transition issue
-- Replace 'your-client-id' with the actual client ID

-- 1. First, let's see the current state of your problematic client
-- (Replace with actual client email or name)
SELECT 
    id,
    name,
    email,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60) as months_since_creation,
    services as current_services,
    tiered_payments
FROM clients 
WHERE email = 'your-client-email@example.com' -- Replace with actual email
   OR name ILIKE '%your-client-name%'; -- Replace with actual name

-- 2. Manually set a client's creation date to test tier transitions
-- (Replace 'client-id-here' with actual client ID)
UPDATE clients 
SET created_at = NOW() - INTERVAL '2 months'  -- Simulate 2 months ago
WHERE id = 'client-id-here'; -- Replace with actual client ID

-- 3. Example: Create a test client with tier transition
INSERT INTO clients (
    name, 
    email, 
    payment_type, 
    created_at, 
    status, 
    services, 
    tiered_payments,
    final_services,
    notes
) VALUES (
    'Test Tier Client',
    'test-tier@example.com',
    'monthly',
    NOW() - INTERVAL '2 months', -- Started 2 months ago
    'active',
    '{"Instagram": 1000, "Twitter": 1200}', -- Current services (should be tier 1)
    '[
        {"amount": 0, "duration_months": 1, "payment_type": "monthly", "services": {"Instagram": 1000, "Twitter": 1200}},
        {"amount": 0, "duration_months": 12, "payment_type": "monthly", "services": {"Instagram": 12000}}
    ]',
    '{"Instagram": 15000, "Twitter": 8000}', -- Final services after all tiers
    'Test client for tier transitions - should be in tier 2 now'
);

-- 4. Force update tier for specific client
SELECT update_specific_client_tier(id) as result
FROM clients 
WHERE email = 'test-tier@example.com';

-- 5. Check the result
SELECT 
    name,
    services as updated_services,
    tiered_payments
FROM clients 
WHERE email = 'test-tier@example.com';
